/**
 * Logic Solver Engine
 * Evaluates logical expressions with NOT (¬), AND (∧), OR (∨), and IMPLIES (⇒).
 */

(function() {
// Tokenizer: Splits string into operators, parentheses, and variable names/constants
function tokenize(str) {
  const regex = /(=>|->|&&|\|\||[¬!~∧&∨|()αβγδ⇒→]|\w+)/g;
  const matches = str.match(regex) || [];
  return matches.map(t => t.trim()).filter(t => t.length > 0);
}

// Normalization: Maps raw tokens to standardized structure with precedence and associativity
function normalizeToken(token) {
  const t = token.toUpperCase();
  if (t === '!' || t === '~' || t === '¬' || t === 'NOT') {
    return { type: 'OP_NOT', val: '¬', prec: 4, assoc: 'R' };
  }
  if (t === '&' || t === '&&' || t === '∧' || t === 'AND' || t === '*') {
    return { type: 'OP_AND', val: '∧', prec: 3, assoc: 'L' };
  }
  if (t === '|' || t === '||' || t === '∨' || t === 'OR' || t === '+' || t === 'V') {
    return { type: 'OP_OR', val: '∨', prec: 2, assoc: 'L' };
  }
  if (t === '=>' || t === '->' || t === '⇒' || t === 'IMPLIES') {
    return { type: 'OP_IMPLIES', val: '⇒', prec: 1, assoc: 'L' };
  }
  if (token === '(') return { type: 'LPAREN', val: '(' };
  if (token === ')') return { type: 'RPAREN', val: ')' };
  
  if (t === 'TRUE' || t === '1') return { type: 'CONST', val: true };
  if (t === 'FALSE' || t === '0') return { type: 'CONST', val: false };
  
  // Greek variables
  if (token === 'α' || t === 'ALPHA') return { type: 'VAR', val: 'α' };
  if (token === 'β' || t === 'BETA') return { type: 'VAR', val: 'β' };
  if (token === 'γ' || t === 'GAMMA') return { type: 'VAR', val: 'γ' };
  if (token === 'δ' || t === 'DELTA') return { type: 'VAR', val: 'δ' };
  
  return { type: 'VAR', val: token };
}

// Convert Infix tokens to Postfix (RPN) using Shunting-Yard
function shuntingYard(str) {
  const tokens = tokenize(str).map(normalizeToken);
  const output = [];
  const opStack = [];
  
  for (let token of tokens) {
    if (token.type === 'CONST' || token.type === 'VAR') {
      output.push(token);
    } else if (token.type === 'OP_NOT' || token.type === 'OP_AND' || token.type === 'OP_OR' || token.type === 'OP_IMPLIES') {
      const o1 = token;
      let o2 = opStack[opStack.length - 1];
      
      while (o2 && o2.type !== 'LPAREN' && (o2.prec > o1.prec || (o2.prec === o1.prec && o1.assoc === 'L'))) {
        output.push(opStack.pop());
        o2 = opStack[opStack.length - 1];
      }
      opStack.push(o1);
    } else if (token.type === 'LPAREN') {
      opStack.push(token);
    } else if (token.type === 'RPAREN') {
      let top = opStack[opStack.length - 1];
      while (top && top.type !== 'LPAREN') {
        output.push(opStack.pop());
        top = opStack[opStack.length - 1];
      }
      if (!top) {
        throw new Error("Mismatched parentheses (extra ')')");
      }
      opStack.pop(); // Remove '('
    }
  }
  
  while (opStack.length > 0) {
    const top = opStack.pop();
    if (top.type === 'LPAREN' || top.type === 'RPAREN') {
      throw new Error("Mismatched parentheses (extra '(')");
    }
    output.push(top);
  }
  
  return output;
}

// Evaluate Postfix expression under environment
function evaluatePostfix(postfixQueue, env) {
  const evalStack = [];
  
  for (let token of postfixQueue) {
    if (token.type === 'CONST') {
      evalStack.push(token.val);
    } else if (token.type === 'VAR') {
      // Resolve variable
      const name = token.val;
      const upperName = name.toUpperCase();
      
      let val = undefined;
      // Look up variable name case-insensitively
      if (env.hasOwnProperty(upperName)) {
        val = env[upperName];
      } else if (env.hasOwnProperty(name)) {
        val = env[name];
      } else if (name === 'α' && env.hasOwnProperty('α')) {
        val = env['α'];
      } else if (name === 'β' && env.hasOwnProperty('β')) {
        val = env['β'];
      } else if (name === 'γ' && env.hasOwnProperty('γ')) {
        val = env['γ'];
      } else if (name === 'δ' && env.hasOwnProperty('δ')) {
        val = env['δ'];
      }
      
      if (val === undefined) {
        // Fallback for T/F constants if they are NOT variable names
        if (upperName === 'T') val = true;
        else if (upperName === 'F') val = false;
        else throw new Error(`Undefined variable '${name}'`);
      }
      
      evalStack.push(val);
    } else if (token.type === 'OP_NOT') {
      if (evalStack.length < 1) {
        throw new Error("Invalid expression (operator '¬' expects 1 operand)");
      }
      const a = evalStack.pop();
      evalStack.push(!a);
    } else {
      // Binary Operators
      if (evalStack.length < 2) {
        throw new Error(`Invalid expression (operator '${token.val}' expects 2 operands)`);
      }
      const b = evalStack.pop(); // Right operand
      const a = evalStack.pop(); // Left operand
      
      if (token.type === 'OP_AND') {
        evalStack.push(a && b);
      } else if (token.type === 'OP_OR') {
        evalStack.push(a || b);
      } else if (token.type === 'OP_IMPLIES') {
        // Implication: a => b is (!a || b)
        evalStack.push(!a || b);
      }
    }
  }
  
  if (evalStack.length !== 1) {
    if (evalStack.length === 0) return null;
    throw new Error("Invalid expression (incomplete evaluation)");
  }
  
  return evalStack[0];
}

// Wrapper to directly evaluate an infix string
function evaluateLogic(expressionStr, env) {
  // Normalize variable environment keys to uppercase for case insensitivity
  const normalizedEnv = {};
  for (let [k, v] of Object.entries(env)) {
    // Keep greek characters or uppercase standard characters
    if (['α', 'β', 'γ', 'δ'].includes(k)) {
      normalizedEnv[k] = v;
    } else {
      normalizedEnv[k.toUpperCase()] = v;
    }
  }
  
  const postfix = shuntingYard(expressionStr);
  return evaluatePostfix(postfix, normalizedEnv);
}

// Export for Node, or attach to window for Browser
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    tokenize,
    normalizeToken,
    shuntingYard,
    evaluatePostfix,
    evaluateLogic
  };
} else {
  window.tokenize = tokenize;
  window.normalizeToken = normalizeToken;
  window.shuntingYard = shuntingYard;
  window.evaluatePostfix = evaluatePostfix;
  window.evaluateLogic = evaluateLogic;
}
})();
