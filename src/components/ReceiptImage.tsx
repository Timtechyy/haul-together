import { useSignedUrl, extractFilePath } from '@/hooks/useSignedUrl';
import { Skeleton } from '@/components/ui/skeleton';

interface ReceiptImageProps {
  receiptUrl: string | null | undefined;
  className?: string;
}

export const ReceiptImage = ({ receiptUrl, className = "w-full max-w-md rounded-lg border shadow-sm" }: ReceiptImageProps) => {
  const filePath = extractFilePath(receiptUrl);
  const { signedUrl, loading } = useSignedUrl('bookingReceipts', filePath);

  if (!receiptUrl) return null;
  
  if (loading) {
    return <Skeleton className={className} style={{ height: '200px' }} />;
  }

  if (!signedUrl) {
    return (
      <div className="text-sm text-muted-foreground">
        Unable to load receipt image
      </div>
    );
  }

  return (
    <img 
      src={signedUrl} 
      alt="Order receipt" 
      className={className}
    />
  );
};
