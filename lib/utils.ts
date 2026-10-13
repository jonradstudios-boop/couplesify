export type ClassValue = string | number | boolean | undefined | null | { [key: string]: any } | ClassValue[];

export function cn(...inputs: any[]): string {
  return inputs
    .flat(Infinity)
    .filter(Boolean)
    .join(' ');
}

export default cn;
