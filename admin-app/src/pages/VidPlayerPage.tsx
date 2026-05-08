import CreativeEditor from '@cesdk/cesdk-js/react';
import { initVideoEditor } from '../imgly';
import './VidPlayerPage.css';

const CESDK_ASSET_BASE_URL = '/assets';

// -- VidPlayerPage ------------------------------------------------------------

export function VidPlayerPage() {
  return (
    <div className="vidplayer-page">
      <CreativeEditor
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore style prop not in typings but works at runtime
        style={{ width: '100%', height: '100%' }}
        config={{ baseURL: CESDK_ASSET_BASE_URL }}
        init={initVideoEditor}
      />
    </div>
  );
}

export default VidPlayerPage;
