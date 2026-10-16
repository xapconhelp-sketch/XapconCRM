import React, { createContext, useContext } from 'react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { NativeSelect } from '../ui/native-select';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Field, FieldGroup, FieldLabel } from '../ui/field';
import IllustratedIcon, { type Illustration } from './IllustratedIcon';
import { History, FolderOpen, Wallet, X } from 'lucide-react';

// Context follows React portals so shared screens and dialogs keep the active app's shared visual system.
export const ContractorDesignContext = createContext(false);

export function RoleIconTile({ name, children, className = '' }: { name: Illustration; children: React.ReactNode; className?: string }) {
  return useContext(ContractorDesignContext) ? <IllustratedIcon name={name} className={className} /> : <>{children}</>;
}

export function RoleSectionIcon({ name }: { name: Illustration }) {
  return useContext(ContractorDesignContext) ? <IllustratedIcon name={name} className="contractor-section-art no-print" /> : null;
}

export function RoleTabIcon({ tab }: { tab: string }) {
  const contractor = useContext(ContractorDesignContext);
  const Icon = tab === 'timeline' ? History : tab === 'documents' ? FolderOpen : Wallet;
  return contractor ? <Icon className="size-4" aria-hidden="true" /> : null;
}

export function RoleCloseIcon() {
  return useContext(ContractorDesignContext) ? <X className="size-4" aria-hidden="true" /> : <>✕</>;
}

export function RoleField({ children }: { children: React.ReactNode }) {
  return useContext(ContractorDesignContext)
    ? <Field><FieldLabel className="contractor-field-label">{children}</FieldLabel></Field>
    : <label className="block">{children}</label>;
}

export function RoleFieldGroup({ children }: { children: React.ReactNode }) {
  return useContext(ContractorDesignContext) ? <FieldGroup>{children}</FieldGroup> : <>{children}</>;
}

export function RoleInput(props: React.ComponentProps<'input'>) {
  const contractor = useContext(ContractorDesignContext);
  return contractor && !['checkbox', 'radio', 'range', 'color', 'hidden'].includes(props.type || '')
    ? <Input {...props} /> : <input {...props} />;
}

export function RoleTextarea(props: React.ComponentProps<'textarea'>) {
  return useContext(ContractorDesignContext) ? <Textarea {...props} /> : <textarea {...props} />;
}

export function RoleSelect(props: React.ComponentProps<'select'>) {
  const contractor = useContext(ContractorDesignContext);
  const { size, ...rest } = props;
  return contractor && !size && !props.multiple ? <NativeSelect {...rest} /> : <select {...props} />;
}

export function RoleModal({ children, title, onClose, busy = false, outerProps, contentProps, wide = false }: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  outerProps?: React.ComponentProps<'div'>;
  contentProps?: React.ComponentProps<'div'>;
}) {
  const contractor = useContext(ContractorDesignContext);
  const returnFocus = React.useRef<HTMLElement | null>(null);
  React.useLayoutEffect(() => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  if (!contractor) return <div {...outerProps}><div {...contentProps}>{children}</div></div>;
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className={`no-print contractor-app contractor-dialog ${wide ? 'contractor-dialog-wide' : ''}`} showCloseButton={false} aria-describedby={undefined}
      onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      onInteractOutside={event => { if (busy) event.preventDefault(); }}
      onCloseAutoFocus={event => { event.preventDefault(); returnFocus.current?.focus(); }}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      {children}
    </DialogContent>
  </Dialog>;
}
