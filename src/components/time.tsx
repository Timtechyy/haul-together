

export const formatTime = (time: string) => {           
//   const [hours, minutes] = time.split(":");
//   const hour = parseInt(hours, 10);
//   const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = new Date(time).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
  return `${formattedHour}`;
};