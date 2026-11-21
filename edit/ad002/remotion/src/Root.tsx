import React from 'react';
import {Composition} from 'remotion';
import {Ad002} from './Ad002';

export const Root: React.FC = () => (
  <Composition id="Ad002" component={Ad002} width={1080} height={1920} fps={30} durationInFrames={1463} />
);
