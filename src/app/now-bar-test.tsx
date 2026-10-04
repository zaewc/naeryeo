import { useMemo } from 'react';

import { NowBarPoc } from '@/features/now-bar-poc';
import { createLiveActivityAdapter } from '@/shared/platform/live-activity';

export default function HomeScreen() {
  const port = useMemo(() => createLiveActivityAdapter(), []);
  return <NowBarPoc port={port} />;
}
