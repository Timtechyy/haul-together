-- Add customer rating column to deliveries table
ALTER TABLE public.deliveries 
ADD COLUMN customer_rating integer CHECK (customer_rating >= 1 AND customer_rating <= 5);

COMMENT ON COLUMN public.deliveries.customer_rating IS 'Customer rating from 1-5 stars after delivery completion';