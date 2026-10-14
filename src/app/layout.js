import "./globals.css";
import { BasketProvider } from "@/context/BasketContext";
import BasketDrawer from "@/components/BasketDrawer";
import Toast from "@/components/Toast";

export const metadata = {
  title: "DriveKH — Professional Car Rental & Fleet Platform in Cambodia",
  description:
    "Photo-first car rentals across Cambodia with instant 15-minute reservation hold, add-on protections, and seamless KHQR Baray payments.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen flex flex-col">
        <BasketProvider>
          {children}
          <BasketDrawer />
          <Toast />
        </BasketProvider>
      </body>
    </html>
  );
}
