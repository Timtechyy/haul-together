import Flatpickr from "react-flatpickr";
import { forwardRef } from "react";
import clsx from "clsx";

interface DatePickerProps {
  id: string;
  name:string;
  value?: Date | string | (Date | string)[];
  onChange?: (dates: Date[]) => void;
  enableTime?: boolean;
  minDate?: Date | string;
  maxDate?: Date | string;
  placeholder?: string;
  className?: string;
  options?: Record<string, any>;
}

export const DatePicker = forwardRef<any, DatePickerProps>(
  (
    {
      id,
      value,
      onChange,
      enableTime = false,
      placeholder = "Select date",
      className,
      name,
      options = {},
    },
    ref,
  ) => {
    return (
      <Flatpickr
        id={id}
        
        ref={ref}
        value={value}
        onChange={onChange}
      
        options={{
          allowInput:true,
          enableTime:false,
          enableSeconds:false,
          dateFormat:"d-m-Y",
          time_24hr: false,
          
          // maxDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),

          disableMobile: true,
          ...options,
        }}
        className={clsx(
          "w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
          "focus:outline-none focus:ring-2 focus:ring-ring",
          className,
        )}
        name={name}
        placeholder={placeholder}
      />
    );
  },
);

DatePicker.displayName = "DatePicker";
