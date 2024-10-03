
export function cap(dev, capabilities) {
    const read = capabilities.read || {};
    const write = capabilities.write || {};
    const readKeys = Object.keys(read);
    const writeKeys = Object.keys(write);

    const rootDiv = document.createElement('div');
    rootDiv.classList.add('capabilities');  

    for (const key of readKeys) {
        const item = read[key];
        rootDiv.appendChild(createReadItem(dev, key, item));
    }

    for (const key of writeKeys) {
        const item = write[key];
        rootDiv.appendChild(createWriteItem(dev, key, item));
    }

    return rootDiv;
    
}

function createReadItem(dev, key, item) {

    const div = document.createElement('div');
    div.classList.add('capability');
    div.classList.add('read');

    const valueSpan = document.createElement('span');
    valueSpan.innerText = '...';
    div.appendChild(valueSpan);

    const button = document.createElement('button');
    button.innerText = Object.values(item).map(i => i.name).join(', ');
    button.onclick = async () => {
        try {
            const value = await dev[key]();
            valueSpan.innerText = Object.entries(value).map(([k, v]) => `${item[k].name}: ${v} ${item[k].unit ? item[k].unit : ''}`).join('\n');
            console.log(value);
        } catch (error) {
            console.error(error);
        }
    };
    div.appendChild(button);


    return div;

    
}

function createWriteItem(dev, key, item) {
    const div = document.createElement('div');
    div.classList.add('capability');
    div.classList.add('write');

    const button = document.createElement('button');
    button.innerText = item.name;
    button.onclick = async () => {
        // pop up a prompt to get the value
        let value = null;
        if (item.type === 'Date') {
            value = new Date();
        } else if (item.type === 'enum') {
            value = prompt(item.name, item.values[0]);
        } else {
            value = prompt(item.name);
        }
        if (value === null) {
            return;
        }

        try {
            await dev[key](value);
        } catch (error) {
            console.error(error);
        }
    };
    div.appendChild(button);
    return div;
}



// example of capabilities object:
// {
//     read: {
//         'getTime': {'time': { name: 'Time', type: 'Date'}},
//         'getTempAndHum': {'temp': { name: 'Teperature', type: 'Number', unit: '°C'}, 'hum': {name: 'Humidity', type: 'Number', unit: '%'}},
//         'getBattery': { 'batt': 'Battery', output: 'Number', unit: '%' },
//         'getTempUnit': { 'tunit': 'Temperature Unit', output: 'enum', values: ['C', 'F']}
//     },
//     write: {
//         'setTime': { name: 'Time', input: 'Date'},
//         'setTempUnit': { name: 'Temperature Unit', input: 'enum', values: ['C', 'F']},
//     },
// }
//
