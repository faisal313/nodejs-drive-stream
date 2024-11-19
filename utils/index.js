
// Helper function to determine the MIME type based on file extension
export const supportedVideoFileExtensions = ['.mp4', '.m4v', '.mov', '.mkv', '.avi', '.wmv', '.flv', '.webm'];

export function determineMimeType(filename) {
    const extension = filename.split('.').pop();
    switch (extension) {
      case 'mp4':
        return 'video/mp4';
      case 'm4v':
        return 'video/x-m4v'; // or 'video/mp4'
      case 'mov':
        return 'video/quicktime';
      case 'mkv':
        return 'video/x-matroska';
      case 'avi':
        return 'video/x-msvideo';
      case 'wmv':
        return 'video/x-ms-wmv';
      case 'flv':
        return 'video/x-flv';
      case 'webm':
        return 'video/webm';
      default:
        return 'application/octet-stream'; // Default MIME type if the extension is not recognized
    }
}