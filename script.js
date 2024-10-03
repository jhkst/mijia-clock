import { LYWSD02MMC } from './devices/lywsd02mmc.js';
import { LYWSDCGQ_01ZM } from './devices/lywsdcgq.js';
import { BTLEDevice } from './btle_device.js';
import { cap } from './capabilities-control.js';


let mi;
const logMaxMessages = 10;
const logMessages = Array(logMaxMessages).fill("");
const devices = [new LYWSD02MMC(), new LYWSDCGQ_01ZM()];

async function connect() {
  log('Connecting to device...'); 
  if (mi && mi.isConnected()) {
    log('Already connected', true);
  } else {
    const device = await navigator.bluetooth.requestDevice({
      filters: devices.map(d => d._requestFilter()),
      optionalServices: devices.map(d => d._requestServices()).flat()
    });

    // add diconnect event listener
    device.addEventListener('gattserverdisconnected', () => {
      log('Disconnected from device');
      if (mi) {
        mi.disconnect();
      }
      mi = null;
      document.getElementById('device-image').src = '';
      document.getElementById('device-name').innerText = '';
      document.getElementById('capabilities-control').replaceChildren();
    });

    mi = devices.find(d => d.isSuitableDevice(device));
    mi.setDevice(device);
    document.getElementById('device-image').src = `devices/${mi.image()}`;
    document.getElementById('device-name').innerText = mi.getName();
    document.getElementById('capabilities-control').replaceChildren();
    document.getElementById('capabilities-control').appendChild(cap(mi, mi.capabilities()));
  }

  await mi.connect();

  log('OK', true);
  log('Device name: ' + mi.getDeviceName());
  log('Device ID: ' + mi.getDeviceId());
}

// Function to update time on the selected Bluetooth device
async function updateTime() {
  try {
    await connect();
    log('Updating time...');
    await mi.setTime();
    log('OK', true);
  } catch (error) {
    log('ERROR', true);
    log('Failed to update time: ' + error);
  }
}

async function readData() {
  try {
    await connect();
    log('Reading data...');
    const th = await mi?.getTempAndHum() || { temp: NaN, hum: NaN };
    const unit = await mi?.getTempUnit() || null;
    const data = {
      'Temperature C': { value: th.temp, unit: '°C' },
      'Temperature F': { value: th.temp * 9 / 5 + 32, unit: '°F' },
      'Humidity': { value: th.hum, unit: '%' },
      'Unit': { value: unit, unit: '' },
      'Battery': { value: await mi?.getBattery(), unit: '%' },
      'Time': { value: await mi?.getTime(), unit: '' },
    }
    // const hist = await mi.getHistoryData();
    // console.log(hist);
    log('OK', true);

    if (unit) { updateUnit(unit); }
    
    document.getElementById('status-message').innerText = Object.entries(data).map(([key, value]) => `${key}: ${value.value} ${value.unit}`).join('\n');
  } catch (error) {
    console.error(error);
    log('ERROR', true);
    log('Failed to read data: ' + error);
  }
}



function updateUnit(unit) {
  document.getElementById('unit-c').checked = unit === 'C';
  document.getElementById('unit-f').checked = unit === 'F';
}

function checkCompatibility() {
  log('Checking Web Bluetooth compatibility...');
  if (!BTLEDevice.isAvailable()) {
    log('Not Supported', true);
  } else {
    log('OK', true);
  }
}

function log(message, sameLine = false) {
  const log = document.getElementById('log');
  if (sameLine) {
    logMessages[logMessages.length - 1] += message;
  } else {
    logMessages.push(message);
  }
  if (logMessages.length > logMaxMessages) {
    logMessages.shift();
  }
  log.innerText = logMessages.join('\n');
}

document.getElementById('connect-button').addEventListener('click', async () => {
  await connect();
});
document.getElementById('disconnect-button').addEventListener('click', async () => { 
  await mi.disconnect(); 
});
// document.getElementById('update-time-button').addEventListener('click', updateTime);
// document.getElementById('read-data').addEventListener('click', readData);
// on unit radiobuton change
// document.getElementsByName('unit').forEach(radio => {
//   radio.addEventListener('change', async () => {
//     await connect();
//     log('Changing unit...');
//     await mi.setTempUnit(radio.value);
//     log('OK', true);
//   });
// });

checkCompatibility();

