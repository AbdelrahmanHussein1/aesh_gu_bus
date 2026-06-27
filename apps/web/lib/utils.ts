export function formatErrorMessage(error: any): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const messages: string[] = [];
    for (const key of Object.keys(error)) {
      if (key !== '_errors' && error[key] && typeof error[key] === 'object' && error[key]._errors) {
        messages.push(`${key}: ${error[key]._errors.join(', ')}`);
      }
    }
    if (error._errors && Array.isArray(error._errors) && error._errors.length > 0) {
      messages.push(error._errors.join(', '));
    }
    return messages.join(' | ') || JSON.stringify(error);
  }
  return String(error);
}
