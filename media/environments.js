(function() {
    const vscode = acquireVsCodeApi();

    window.createNewEnvironment = function() {
        const name = prompt('Enter environment name:');
        if (name) {
            vscode.postMessage({
                command: 'createEnvironment',
                name: name
            });
        }
    };

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'loadEnvironments':
                loadEnvironments(message.environments);
                break;
        }
    });

    function loadEnvironments(environments) {
        const environmentList = document.getElementById('environmentList');
        environmentList.innerHTML = '';
        for (const [name, content] of Object.entries(environments)) {
            const envDiv = document.createElement('div');
            envDiv.textContent = `${name}: ${JSON.stringify(content)}`;
            environmentList.appendChild(envDiv);
        }
    }
})();