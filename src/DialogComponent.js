'use client';

import React from 'react';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

export default function DialogComponent() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="button">Open Dialog</button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle asChild>
          <VisuallyHidden>This is an accessible title</VisuallyHidden>
        </DialogTitle>
        <div>
          {/* Your content here */}
          <p>This is the content inside the dialog</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
