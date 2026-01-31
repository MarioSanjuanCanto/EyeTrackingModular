
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
  
  // Exponential Moving Average for the raw iris position to reduce jitter at the source
  private lastRawRelative: Point = { x: 0.5, y: 0.5 };
  private smoothingAlpha = 0.25; // Lower = more stable but more lag. Higher = more responsive but jittery.

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
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.75,
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
   */
  private getRelativeIris(landmarks: any[]): Point {
    // Landmarks for Eye Socket (Left Eye)
    const iris = landmarks[468]; 
    const left = landmarks[33];
    const right = landmarks[133];
    const top = landmarks[159];
    const bottom = landmarks[145];

    const hRange = right.x - left.x;
    const vRange = bottom.y - top.y;

    const rawX = (iris.x - left.x) / hRange;
    const rawY = (iris.y - top.y) / vRange;

    // Apply Exponential Moving Average (EMA) to smooth out micro-fluctuations
    this.lastRawRelative.x = this.lastRawRelative.x * (1 - this.smoothingAlpha) + rawX * this.smoothingAlpha;
    this.lastRawRelative.y = this.lastRawRelative.y * (1 - this.smoothingAlpha) + rawY * this.smoothingAlpha;

    return { x: this.lastRawRelative.x, y: this.lastRawRelative.y };
  }

  recordCalibrationAnchor(targetX: number, targetY: number, rawX: number, rawY: number) {
    const existingIndex = this.anchors.findIndex(a => a.target.x === targetX && a.target.y === targetY);
    if (existingIndex > -1) {
      this.anchors[existingIndex].raw = { x: rawX, y: rawY };
    } else {
      this.anchors.push({ target: { x: targetX, y: targetY }, raw: { x: rawX, y: rawY } });
    }
  }

  resetCalibration(): void {
    this.anchors = [];
    this.lastRawRelative = { x: 0.5, y: 0.5 };
  }

  private onResults(results: any): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      if (this.onGazeCallback) this.onGazeCallback(null);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const relative = this.getRelativeIris(landmarks);

    let screenX = 0.5;
    let screenY = 0.5;

    if (this.anchors.length >= 5) {
      const minX = Math.min(...this.anchors.map(a => a.raw.x));
      const maxX = Math.max(...this.anchors.map(a => a.raw.x));
      const minY = Math.min(...this.anchors.map(a => a.raw.y));
      const maxY = Math.max(...this.anchors.map(a => a.raw.y));

      const rangeX = (maxX - minX) || 0.1;
      const rangeY = (maxY - minY) || 0.1;

      let normX = (relative.x - minX) / rangeX;
      let normY = (relative.y - minY) / rangeY;

      // Invert X (mirroring) and Invert Y (based on user feedback)
      normX = 1 - normX;
      normY = 1 - normY; 

      // Clamp and Scale to Screen
      screenX = Math.max(0, Math.min(1, normX)) * window.innerWidth;
      screenY = Math.max(0, Math.min(1, normY)) * window.innerHeight;
    } else {
      // Fallback
      screenX = (1 - relative.x) * window.innerWidth;
      screenY = (1 - relative.y) * window.innerHeight;
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
