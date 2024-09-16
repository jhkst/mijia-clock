// Global constants for Bluetooth configuration
const SERVICE_UUID = 'EBE0CCB0-7A0A-4B0C-8A1A-6FF2997DA3A6'.toLowerCase();
const CHARACTERISTIC_UUID = 'EBE0CCB7-7A0A-4B0C-8A1A-6FF2997DA3A6'.toLowerCase();


// Function to calculate current time in bytes (as in your original script)
async function calculateTimeBytes() {
  const ts = Math.floor(Date.now() / 1000);  // Current Unix timestamp
  const hexts = ts.toString(16).padStart(8, '0').toUpperCase();  // Convert to hex
  
  const tzOffset = new Date().getTimezoneOffset() / -60;  // Get timezone offset in hours
  const tz256 = (tzOffset & 0xFF).toString(16).padStart(2, '0').toUpperCase();
  
  const hextime = hexts.slice(6, 8) + hexts.slice(4, 6) + hexts.slice(2, 4) + hexts.slice(0, 2) + tz256;
  
  const timeBytes = new Uint8Array(hextime.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  return timeBytes;
}

// Function to update time on the selected Bluetooth device
async function updateTime() {
  try {
    const device = await navigator.bluetooth.requestDevice({
        filters: [{name: 'LYWSD02'}],
        optionalServices: [SERVICE_UUID]
    });

    document.getElementById('status-message').innerText = 'Updating time...';

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

    
    const timeBytes = await calculateTimeBytes();
    await characteristic.writeValue(timeBytes);
    document.getElementById('status-message').innerText = 'Time updated successfully!';
    
    await device.gatt.disconnect();
  } catch (error) {
    document.getElementById('status-message').innerText = 'Failed to update time: ' + error;
  }
}

function checkCompatibility() {
  if (!navigator.bluetooth) {
    document.getElementById('status-message').innerText = 'Web Bluetooth is not supported in your browser!';
    document.getElementById('update-time-button').disabled = true;
  }
}

document.getElementById('update-time-button').addEventListener('click', updateTime);

checkCompatibility();
