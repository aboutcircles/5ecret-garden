export type ButtonVariant = 'primary' | 'ghost';

export interface ActionButton {
  id: string;
  label: string; 
  iconNode?: any; // Lucide component
  onClick: () => void | Promise<void>;
  variant?: ButtonVariant;
  disabled?: boolean;
}
