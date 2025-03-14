import { SyncSidebar } from './SyncSidebar';

interface Props {
  children: React.ReactNode;
}

export const SyncProvider = ({ children }: Props) => {
  return (
    <>
      {children}
      <SyncSidebar />
    </>
  );
};