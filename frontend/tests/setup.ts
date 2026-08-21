import '@testing-library/jest-dom';

// Polyfill HTMLCanvasElement.getContext for jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}
