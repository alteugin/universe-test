'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string(),
  price: z.coerce.number().nonnegative('Price must be ≥ 0'),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', price: 0 },
  });

  const mutation = useMutation({
    mutationFn: api.create,
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      form.reset();
      setOpen(false);
      toast.success(`Product "${product.name}" created`);
    },
    onError: (err: Error) => {
      toast.error('Failed to create product', { description: err.message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create Product</DialogTitle>
        <DialogDescription>Fill out the fields below to add a product.</DialogDescription>

        <form
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          className="mt-4 space-y-4"
        >
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium">Name</label>
            <Input id="name" {...form.register('name')} aria-invalid={!!form.formState.errors.name} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="description" className="text-sm font-medium">Description</label>
            <Textarea id="description" {...form.register('description')} />
          </div>

          <div className="space-y-1">
            <label htmlFor="price" className="text-sm font-medium">Price</label>
            <Input
              id="price"
              type="number"
              step="0.01"
              {...form.register('price')}
              aria-invalid={!!form.formState.errors.price}
            />
            {form.formState.errors.price && (
              <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
            )}
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
