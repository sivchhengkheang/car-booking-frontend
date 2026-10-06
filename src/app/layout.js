import "./globals.css";

export const metadata = {
  title: "DriveKH — Premium Car Rentals in Cambodia",
  description: "Rent premium cars across Cambodia. ABA, ACLEDA, Wing payments accepted via Baray.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
