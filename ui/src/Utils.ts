import { toast } from 'react-toastify';
import { ToastMessageOptions } from './interfaces/interfaces';

export const showSuccess = ({
  content,
  duration,
}: ToastMessageOptions): void => {
  toast.success(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const showError = ({ content, duration }: ToastMessageOptions): void => {
  toast.error(content, {
    position: 'top-right',
    // autoClose: duration,
  });
};

export const showWarning = ({
  content,
  duration,
}: ToastMessageOptions): void => {
  toast.warn(content, {
    position: 'top-right',
    autoClose: duration,
  });
};

export const wait = async (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};
