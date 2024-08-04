(function() {
    const vscode = acquireVsCodeApi();

    document.getElementById('configList').innerHTML = getConfigFiles();

    window.createNewConfig = function() {
        const fileName = prompt('Enter configuration file name:');
        if (fileName) {
            const content = prompt('Enter configuration content:');
            if (content) {
                vscode.postMessage({
                    command: 'saveConfig',
                    fileName: fileName,
                    content: content
                });
            }
        }
    };

    function getConfigFiles() {
        // Fetch and display existing configuration files
        return '<ul><li>config1.yaml</li><li>config2.yaml</li></ul>';
    }
})();
