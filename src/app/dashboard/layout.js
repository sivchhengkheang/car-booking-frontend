import DashboardShell from "./_components/DashboardShell";

export const metadata = {
  title: "Dashboard — DriveKH",
};

export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}
