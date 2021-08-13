/// <reference types="cypress" />
import { createCypressMachine, createCypressModel } from '../../src';

type ValueEvents = {
  type: 'TODO_EDIT' | 'TODO_UPDATE';
  value?: string;
};

type TestEvents =
  | ValueEvents
  | {
      type:
        | `MARK.${'Completed' | 'Active'}`
        | `ADD_TODO`
        | 'CLEAR_COMPLETED'
        | 'TODO_TOGGLE'
        | 'TODO_DELETE'
        | 'CANCEL_EDIT';
    };

interface TestContext {
  todoCount: number;
}

const testMachine = createCypressMachine<TestContext, TestEvents>(
  {
    id: 'Todo',
    initial: 'Active',
    on: {
      ADD_TODO: 'Active'
    },
    states: {
      Completed: {
        on: {
          TODO_EDIT: '#Todo.EditingCompleted',
          CLEAR_COMPLETED: '#Todo.Deleted',
          TODO_DELETE: '#Todo.Deleted',
          TODO_TOGGLE: 'Active',
          'MARK.Active': 'Active'
        }
      },
      Active: {
        on: {
          TODO_TOGGLE: 'Completed',
          'MARK.Completed': 'Completed',
          TODO_EDIT: '#Todo.EditingActive',
          TODO_DELETE: '#Todo.Deleted'
        }
      },
      EditingCompleted: {
        on: {
          CANCEL_EDIT: 'Completed',
          TODO_UPDATE: 'Completed'
        }
      },
      EditingActive: {
        on: {
          CANCEL_EDIT: 'Active',
          TODO_UPDATE: 'Active'
        }
      },
      Deleted: {
        type: 'final'
      }
    }
  },
  {
    Deleted: () => {
      cy.get('.todo-list li').should('not.exist');
      cy.get('.main').should('not.be.visible');
      return cy.get('.footer').should('not.be.visible');
    },
    Editing: () => {
      cy.get('.todo-list li').should('have.class', 'editing');
      cy.get('.main').should('be.visible');
      return cy.get('.footer').should('be.visible');
    },
    Unknown: (testContext) => {
      if (testContext.todoCount === 0) {
        cy.get('.todo-list li').should('not.exist');
        cy.get('.main').should('not.be.visible');
        return cy.get('.footer').should('not.be.visible');
      }
      cy.get('.todo-list li').should('have.length', testContext.todoCount);
      cy.get('.main').should('be.visible');
      return cy.get('.footer').should('be.visible');
    }
  }
);

const testModel = createCypressModel<TestContext>(testMachine, {
  TODO_EDIT: () => cy.get('.todo-list li').eq(0).dblclick(),
  TODO_UPDATE: {
    cases: [{ value: 'Value one' }, { value: 'Value 2' }],
    exec: (_, testCase) => cy.focused().clear().type(`${testCase.value}{enter}`)
  },
  'MARK.Completed': () => cy.get('.toggle').eq(0).check(),
  'MARK.Active': () => cy.get('.toggle').eq(0).uncheck(),
  CLEAR_COMPLETED: () => cy.contains('Clear completed').click(),
  TODO_TOGGLE: () => cy.get('.toggle').eq(0).click(),
  TODO_DELETE: (testContext) => {
    testContext.todoCount -= 1;
    return cy.get('.destroy').eq(0).click({ force: true });
  },
  CANCEL_EDIT: () => cy.focused().type('{esc}'),
  ADD_TODO: (testContext) => {
    testContext.todoCount += 1;
    return cy.get('.new-todo').type('New Todo!{enter}');
  }
});

const testPlans = testModel.getSimplePathPlans();
testPlans.forEach((plan) => {
  describe(plan.description, () => {
    plan.paths.forEach((path) => {
      it(path.description, () => {
        cy.visit('/');
        cy.clearLocalStorage();
        cy.get('.new-todo')
          .type('Hello World!{enter}')
          .then(() => {
            path.test({ todoCount: 1 });
          });
      });
    });
  });
});
