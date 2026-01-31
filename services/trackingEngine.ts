
import { Point } from '../types';

declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

export class TrackingEngine {
  private static instance: TrackingEngine;
  private faceMesh: any;
  private camera: any;
  private videoElement: HTMLVideoElement | null = null;
  private isInitialized: boolean = false;
  private onGazeCallback: ((point: Point | null) => void) | null = null;

  // Calibration boundaries (normalized iris coordinates)
  private minX = 0.42;
  private maxX = 0.58;
  private minY = 0.42;
  private maxY = 0.58;

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
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
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
   * Updates the internal mapping ranges based on calibration data.
   * This is called when the user "looks" at corners.
   */
  updateCalibrationRange(irisX: number, irisY: number) {
    // We expand the range based on where the user actually looks
    this.minX = Math.min(this.minX, irisX);
    this.maxX = Math.max(this.maxX, irisX);
    this.minY = Math.min(this.minY, irisY);
    this.maxY = Math.max(this.maxY, irisY);
  }

  resetCalibration(): void {
    // Reset to tighter defaults
    this.minX = 0.45;
    this.maxX = 0.55;
    this.minY = 0.45;
    this.maxY = 0.55;
  }

  private onResults(results: any): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      if (this.onGazeCallback) this.onGazeCallback(null);
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    
    // Iris landmarks: 468 (Left Center), 473 (Right Center)
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];
    const avgIrisX = (leftIris.x + rightIris.x) / 2;
    const avgIrisY = (leftIris.y + rightIris.y) / 2;

    // Use current range to map to screen
    // We add a small buffer (10%) to the range to make reaching corners easier
    const padding = 0.02;
    const rangeX = (this.maxX - this.minX) || 0.1;
    const rangeY = (this.maxY - this.minY) || 0.1;

    let screenX = (avgIrisX - (this.minX + padding)) / (rangeX - padding * 2);
    let screenY = (avgIrisY - (this.minY + padding)) / (rangeY - padding * 2);

    // Invert X because camera is mirrored
    screenX = 1 - screenX;

    if (this.onGazeCallback) {
      this.onGazeCallback({ 
        x: screenX * window.innerWidth, 
        y: screenY * window.innerHeight 
      });
      
      // We also pass the raw iris data for calibration components to use
      (this.onGazeCallback as any).rawIris = { x: avgIrisX, y: avgIrisY };
    }
  }

  getRawIris(): Point | null {
    return (this.onGazeCallback as any)?.rawIris || null;
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
