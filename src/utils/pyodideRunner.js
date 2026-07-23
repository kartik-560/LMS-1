// Singleton instance to avoid reloading Pyodide multiple times
let pyodideInstance = null;

export const initPyodide = async () => {
  if (!pyodideInstance && window.loadPyodide) {
    pyodideInstance = await window.loadPyodide();
  }
  return pyodideInstance;
};

export const runPythonTestCases = async (userCode, testCases) => {
  const pyodide = await initPyodide();
  if (!pyodide) {
    throw new Error("Pyodide failed to initialize.");
  }

  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    
    // Inject runner code that redirects stdout to capture print outputs
    const wrapperScript = `
import sys
import io

sys.stdout = io.StringIO()

def run_test():
${userCode.split('\n').map(line => '    ' + line).join('\n')}
    
    # Execute function call if input is provided
    try:
        input_data = ${tc.input || '""'}
        if 'calculateTotal' in locals():
            res = calculateTotal(input_data)
            if res is not None:
                print(res)
    except Exception as e:
        print(f"Error: {e}")

run_test()
sys.stdout.getvalue().strip()
`;

    try {
      const rawOutput = await pyodide.runPythonAsync(wrapperScript);
      const actualOutput = String(rawOutput || "").trim();
      const expectedOutput = String(tc.expectedOutput || "").trim();

      results.push({
        testCaseNumber: i + 1,
        input: tc.input || "(Empty)",
        expected: expectedOutput,
        actual: actualOutput,
        passed: actualOutput === expectedOutput,
        isError: false
      });
    } catch (err) {
      results.push({
        testCaseNumber: i + 1,
        input: tc.input || "(Empty)",
        expected: tc.expectedOutput,
        actual: err.message,
        passed: false,
        isError: true
      });
    }
  }

  return results;
};