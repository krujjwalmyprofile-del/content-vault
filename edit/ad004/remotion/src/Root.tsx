import React from 'react';
import {Composition} from 'remotion';
import {Ad004} from './Ad004';
import {Ad004b} from './Ad004b';

export const Root: React.FC = () => (
  <>
    <Composition id="Ad004" component={Ad004} width={1080} height={1920} fps={30} durationInFrames={1362} />
    <Composition id="Ad004b" component={Ad004b} width={1080} height={1920} fps={30} durationInFrames={1069} />
  </>
);
