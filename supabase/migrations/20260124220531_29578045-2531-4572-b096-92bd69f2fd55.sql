-- Drop existing trigger
DROP TRIGGER IF EXISTS trg_requeue_delivery ON deliveries;

-- Create optimized trigger that only fires on status/driver_id changes
CREATE TRIGGER trigger_requeue_delivery
  AFTER UPDATE OF status, driver_id
  ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION requeue_delivery_for_drivers();