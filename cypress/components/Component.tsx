import { useMachine } from '@xstate/react';
import * as React from 'react';
import { createMachine } from 'xstate';

interface Props {
  happyLabel: string;
  sadLabel: string;
}

export const happyMachine = createMachine({
  initial: 'sad',
  states: {
    sad: { on: { TOGGLE: 'happy' } },
    happy: { on: { TOGGLE: 'sad' } }
  }
});

export function Component({ sadLabel, happyLabel }: Props): JSX.Element {
  const [state, send] = useMachine(happyMachine);
  return (
    <button type="button" onClick={() => send({ type: 'TOGGLE' })}>
      {state.matches('sad') ? sadLabel : happyLabel}
    </button>
  );
}
