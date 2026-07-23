let phpInstance = null;

// Initialize the WebAssembly PHP Runtime
export const initPhp = async () => {
    if (!phpInstance) {
        // Dynamically import the ESM module from a CDN
        const { PhpWeb } = await import('https://cdn.jsdelivr.net/npm/php-wasm/PhpWeb.mjs');
        phpInstance = new PhpWeb();
        
        // Wait for WebAssembly binary to finish downloading and instantiating
        await new Promise(resolve => phpInstance.addEventListener('ready', resolve));
    }
    return phpInstance;
};

export const runPhpTestCases = async (userCode, testCases) => {
    const php = await initPhp();
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        let actualOutput = "";

        // Listener to capture PHP 'echo' or 'print' output
        const outputListener = (event) => {
            if (event.detail) actualOutput += event.detail.join('');
        };
        php.addEventListener('output', outputListener);

        try {
            // Inject standard input as a JSON string so PHP can read it
            const scriptToRun = `
                <?php
                // Decode the input
                $input = json_decode('${tc.input || "null"}', true);
                
                // User Code goes here
                ${userCode.replace('<?php', '')}
                
                // If a calculateTotal function exists, run it
                if (function_exists('calculateTotal')) {
                    echo calculateTotal($input);
                }
                ?>
            `;

            // Execute the PHP code
            await php.run(scriptToRun);

            const expectedOutput = String(tc.expectedOutput || "").trim();
            actualOutput = actualOutput.trim();

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
        } finally {
            // Clean up the event listener for the next test case
            php.removeEventListener('output', outputListener);
        }
    }

    return results;
};