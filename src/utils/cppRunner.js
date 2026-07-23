export const runCppTestCases = async (userCode, testCases) => {
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    let output = "";

    // Intercept C++ 'cout' and 'cin'
    const config = {
      stdio: {
        write: (str) => {
          output += str;
        }
      }
    };

    try {
      // Execute the C++ code
      // JSCPP.run(code, input, config)
      window.JSCPP.run(userCode, tc.input || "", config);

      const actualOutput = output.trim();
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
        actual: err.message, // Will capture syntax errors and segfaults
        passed: false,
        isError: true
      });
    }
  }

  return results;
};