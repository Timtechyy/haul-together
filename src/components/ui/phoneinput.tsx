import React from "react";
import PhoneInput, {
  	formatPhoneNumber,
	formatPhoneNumberIntl,
    isValidPhoneNumber,
	isPossiblePhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputFieldProps {
  id:string;
  placeholder: string;    
  value: string | undefined;
  onChange: (value: undefined) => void;
  required?: boolean;
  disabled?:boolean;
}

const PhoneInputField: React.FC<PhoneInputFieldProps> = ({
  id,
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false
}) => {
  const valueError =
    value
      ? (isValidPhoneNumber(value) ? undefined : "Invalid phone number")
      : required
      ? "Phone number required"
      : undefined;

  return (
    <PhoneInput
        className=""
        id={id}
        placeholder={placeholder}
        international
        defaultCountry="US"
        countryCallingCodeEditable={false}
        value={value}
        onChange={onChange}
        required={required}
        error={valueError}
        disabled={disabled}
    />
  );    
};

export default PhoneInputField;
