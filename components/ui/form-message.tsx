import { cn } from "@/lib/utils";

export type Message = {
  type: "success" | "error";
  text: string;
};

interface FormMessageProps {
  message?: Message;
  className?: string;
}

export function FormMessage({ message, className }: FormMessageProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        {
          "bg-green-50 text-green-800": message.type === "success",
          "bg-red-50 text-red-800": message.type === "error",
        },
        className
      )}
    >
      {message.text}
    </div>
  );
}
