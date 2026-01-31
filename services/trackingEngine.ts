
import { Point } from '../types';

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

interface CalibrationAnchor {
  target: Point; // Screen normalized 0-1
  raw: Point;    // Iris-relative 0-1
}

export class TrackingEngine {
  private static instance: TrackingEngine;
  private faceMesh: any;
  private camera: any;
  private videoElement: HTMLVideoElement | null = null;
  private isInitialized: boolean = false;
  private onGazeCallback: ((point: Point | null) => void) | null = null;

  // We store 5 specific anchors for interpolation
  private anchors: CalibrationAnchor[] = [];
  
  // Running average for the last raw iris position
  private lastRawRelative: Point = { x: 0.5, y: 0.5 };

  private constructor() {}

  static getInstance(): TrackingEngine {
    if (!TrackingEngine.instance) {
      TrackingEngine.instance = new TrackingEngine();
    }
    return TrackingEngine.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.videoElement = document.getElementById('mediapipe-video') as HTMLVideoElement;
    
    if (!window.FaceMesh || !window.Camera) {
      throw new Error("MediaPipe scripts not loaded");
    }

    this.faceMesh = new window.FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    this.faceMesh.onResults(this.onResults.bind(this));

    this.camera = new window.Camera(this.videoElement, {
      onFrame: async () => {
        await this.faceMesh.send({ image: this.videoElement! });
      },
      width: 640,
      height: 480,
    });

    await this.camera.start();
    this.isInitialized = true;
  }

  /**
   * Calculates the iris position relative to the eye socket.
   * This is the key to head-invariant tracking.
   */
  private getRelativeIris(landmarks: any[]): Point {
    // Landmarks for Eye Socket (Left Eye)
    // 33: Left Corner, 133: Right Corner, 159: Top, 145: Bottom
    const iris = landmarks[468]; // Left Iris Center
    const left = landmarks[33];
    const right = landmarks[133];
    const top = landmarks[159];
    const bottom = landmarks[145];

    const hRange = right.x - left.x;
    const vRange = bottom.y - top.y;

    // Calculate position of iris within the box of the eye socket
    // We use a sensitivity multiplier because eye movement is small
    const x = (iris.x - left.x) / hRange;
    const y = (iris.y - top.y) / vRange;

    return { x, y };
  }

  recordCalibrationAnchor(targetX: number, targetY: number, rawX: number, rawY: number) {
    // Add or update anchor
    const existingIndex = this.anchors.findIndex(a => a.target.x === targetX && a.target.y === targetY);
    if (existingIndex > -1) {
      this.anchors[existingIndex].raw = { x: rawX, y: rawY };
    } else {
      this.anchors.push({ target: { x: targetX, y: targetY }, raw: { x: rawX, y: rawY } });
    }
  }

  resetCalibration(): void {
    this.anchors = [];
  }

  private onResults(results: any): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      if (this.onGazeCallback) this.onGazeCallback(null);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const relative = this.getRelativeIris(landmarks);
    this.lastRawRelative = relative;

    // Mapping Logic
    let screenX = 0.5;
    let screenY = 0.5;

    if (this.anchors.length >= 5) {
      // Piecewise Linear Mapping or weighted interpolation
      // For now, we find the min/max of our recorded relative iris positions
      const minX = Math.min(...this.anchors.map(a => a.raw.x));
      const maxX = Math.max(...this.anchors.map(a => a.raw.x));
      const minY = Math.min(...this.anchors.map(a => a.raw.y));
      const maxY = Math.max(...this.anchors.map(a => a.raw.y));

      const rangeX = (maxX - minX) || 0.1;
      const rangeY = (maxY - minY) || 0.1;

      // Map current relative iris to 0-1 space based on our recorded extremes
      let normX = (relative.x - minX) / rangeX;
      let normY = (relative.y - minY) / rangeY;

      // Invert X because MediaPipe landmarks are in image-space (mirrored for user)
      normX = 1 - normX;

      // Clamp and Scale to Screen
      screenX = Math.max(0, Math.min(1, normX)) * window.innerWidth;
      screenY = Math.max(0, Math.min(1, normY)) * window.innerHeight;
    } else {
      // Fallback to center-relative basic mapping if not calibrated
      screenX = (1 - relative.x) * window.innerWidth;
      screenY = relative.y * window.innerHeight;
    }

    if (this.onGazeCallback) {
      this.onGazeCallback({ x: screenX, y: screenY });
    }
  }

  getRawIris(): Point | null {
    return this.lastRawRelative;
  }

  setCallback(callback: (data: Point | null) => void): void {
    this.onGazeCallback = callback;
  }

  pause(): void {
    if (this.camera) this.camera.stop();
  }

  async resume(): Promise<void> {
    if (this.camera) await this.camera.start();
  }

  stop(): void {
    if (this.camera) {
      this.camera.stop();
      this.isInitialized = false;
    }
  }
}
