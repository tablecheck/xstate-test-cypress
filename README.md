# xstate-test-cypress

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

Utilities for adapting @xstate/test to work more easily with cypress 7+

## Usage

Basic usage is as follows, for more complete usage with types refer to `/cypress/integration/todo.spec.ts`.

Note that `testContext` is the object that you pass in to `plan.test(...)`, it has no relation to the context of the machine.

```js
import { createCypressMachine, createCypressModel } from 'xstate-test-cypress';

const testMachine = createCypressMachine(
  {
    states: {
      parent: {
        on: {
          SIMPLE: 'other'
        },
        states: {
          child: {
            on: { CASES: 'other' }
          }
        }
      },
      other: {}
    }
  },
  options,
  {
    parent: (testContext) => cy.get('something').should('be.visible'),
    'parent.child': (testContext) => {
      cy.get('something').should('have.length', 2);
      // Note that all these functions must return a Chainable
      return cy.get('something-else').should('contain', 'some text');
    }
  }
);

const testModel = createCypressModel(testMachine, {
  SIMPLE: () => cy.get('button').eq(0).click(),
  CASES: {
    cases: [{ value: 'Value one' }, { value: 'Value 2' }],
    exec: (testContext, testCase) => {
      testContext.someCounter += 1;
      return cy.focused().clear().type(`${testCase.value}{enter}`);
    }
  }
});

const testPlans = testModel.getSimplePathPlans();
testPlans.forEach((plan) => {
  describe(plan.description, () => {
    plan.paths.forEach((path) => {
      it(path.description, () => {
        cy.visit('/');
        cy.wait(0).then(() => {
          path.test({ someCounter: 1 });
        });
      });
    });
  });
});
```

Test application is forked from the [TodoMVC](http://todomvc.com) site.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/SimeonC"><img src="https://avatars.githubusercontent.com/u/1085899?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Simeon Cheeseman</b></sub></a><br /><a href="https://github.com/tablecheck/xstate-test-cypress/commits?author=SimeonC" title="Documentation">📖</a> <a href="#infra-SimeonC" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/tablecheck/xstate-test-cypress/commits?author=SimeonC" title="Tests">⚠️</a> <a href="https://github.com/tablecheck/xstate-test-cypress/commits?author=SimeonC" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
