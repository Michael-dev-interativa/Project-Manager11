import * as DialogPrimitive from '@radix-ui/react-dialog';
import './dialog.radix.css';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogOverlay = DialogPrimitive.Overlay;
export const DialogContent = DialogPrimitive.Content;
export const DialogHeader = ({ children }) => <div className="dialog-header">{children}</div>;
export const DialogTitle = DialogPrimitive.Title;
export const DialogFooter = ({ children }) => <div className="dialog-footer">{children}</div>;
export const DialogDescription = DialogPrimitive.Description;