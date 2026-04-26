import ManageClient from './ManageClient';

export default function ManagePage() {
  const defaultUnits = ['เม็ด', 'แคปซูล', 'ขวด', 'แผง', 'ซอง', 'หลอด'];
  return <ManageClient initialData={[]} initialSearch="" initialUnits={defaultUnits} />;
}
