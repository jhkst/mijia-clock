import { BTLEDevice } from '../btle_device.js';


const DEVICE_NAME = 'LYWSD02';
const SERVICE_UUID = 'ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6';
const CH_TIMESTAMP = 'ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6';       // (RW) Timestamp
const CH_TEMP_HUM = 'ebe0ccc1-7a0a-4b0c-8a1a-6ff2997da3a6';        // (RN) Temperature, Humidity and Battery voltage
const CH_BATTERY = 'ebe0ccc4-7a0a-4b0c-8a1a-6ff2997da3a6';         // (R) Battery percentage
const CH_UNIT = 'ebe0ccbe-7a0a-4b0c-8a1a-6ff2997da3a6';            // (RW) Temperature Uint (C or F)
const CH_LAST_HIST = 'ebe0ccb9-7a0a-4b0c-8a1a-6ff2997da3a6';       // (R) Last calculated hour record and next not calculated since unpacking
const CH_HIST = 'ebe0ccbc-7a0a-4b0c-8a1a-6ff2997da3a6';            // (RN) Get array of history records starting from last calculated hour record
const CH_LAST_HOUR_HIST = 'ebe0ccbb-7a0a-4b0c-8a1a-6ff2997da3a6';  // (R) Last calculated hour data


// EBE0CCC2-7A0A-4B0C-8A1A-6FF2997DA3A6 (RW) AI: Read or write Temperature calibration.  e.g. 0x0000
// EBE0CCC3-7A0A-4B0C-8A1A-6FF2997DA3A6 (RW) e.g. 0x00FF00FF00FF
// EBE0CCC8-7A0A-4B0C-8A1A-6FF2997DA3A6 (W)
// EBE0CCD2-7A0A-4B0C-8A1A-6FF2997DA3A6 (W)


export class LYWSD02MMC extends BTLEDevice {

    constructor(device) {
        super(device);
    }

    getName() {
        return 'Xiaomi Temperature and Humidity Monitor Sensor LYWSD02MMC';
    }

    _requestFilter() {
        return {name: DEVICE_NAME};
    }

    _requestServices() {
        return [SERVICE_UUID];
    }

    image() {
        return 'lywsd02mmc.jpg';
    }

    capabilities() {
        return {
            read: {
                'getTime': {'time': { name: 'Time', type: 'Date'}},
                'getTempAndHum': {'temp': { name: 'Teperature', type: 'Number', unit: '°C'}, 'hum': {name: 'Humidity', type: 'Number', unit: '%'}},
                'getBattery': { 'batt': {name: 'Battery', type: 'Number', unit: '%' }},
                'getTempUnit': { 'tunit': {name: 'Temperature Unit', type: 'enum', values: ['C', 'F']}}
            },
            write: {
                'setTime': { name: 'Time', type: 'Date'},
                'setTempUnit': { name: 'Temperature Unit', type: 'enum', values: ['C', 'F']},
            },
        };
    }

    async setTime(time) {
        if (!time) {
            time = Date.now();
        }

        const date = new Date(time);

        const timeBytes = new Uint8Array([
            ...new Uint32Array([time / 1000]).subarray(0, 1),
            date.getTimezoneOffset() / -60
        ]);

        return await this._setCharacteristicValue(SERVICE_UUID, CH_TIMESTAMP, timeBytes);
    }

    async getTime() {
        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_TIMESTAMP);

        const timestamp = value.getUint32(0, true);
        const tzOffset = value.getUint8(4);

        const date = new Date(timestamp * 1000);
        const localTZ = date.getTimezoneOffset() / -60;
        date.setHours(date.getHours() + tzOffset - localTZ);

        return { 'time': date };
    }

    async getTempAndHum() {
        const val = await this._getNotifiedValue(SERVICE_UUID, CH_TEMP_HUM);
        return {
            temp: val.getInt16(0, true) / 100,
            hum: val.getUint8(2)
        };
    }

    async setTempUnit(unit) {
        const UNITS = {
            'C': 0x00,
            'F': 0x01
        };

        return await this._setCharacteristicValue(SERVICE_UUID, CH_UNIT, new Uint8Array([UNITS[unit]]));
    }

    async getTempUnit() {
        const UNITS = val => val === 0x01 ? 'F' : 'C';

        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_UNIT);
        const unit = value.getUint8(0);
        return {'tunit': UNITS(unit)};
    }

    async getBattery() {
        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_BATTERY);
        return {'batt': value.getUint8(0)};
    }

    async getHistoryData() {
        const records = [];
        const ln = await this.getLastCalculatedHourIndexAndNextIndex();

        const emitter = await this._getNotifiedValueEventEmitter(SERVICE_UUID, CH_HIST);

        return new Promise((resolve, reject) => {
            emitter.on('value', (event) => {
                try {
                    const value = event.target.value;
                    // all little-endian
                    const idxNum = value.getUint32(0, true);
                    const timestamp = value.getUint32(4, true);
                    const tempRowMax = value.getInt16(8, true) / 100;
                    const humMax = value.getUint8(10);
                    const tempRowMin = value.getInt16(11, true) / 100;
                    const humMin = value.getUint8(13);
                    records.push({idxNum, timestamp, tempRowMax, humMax, tempRowMin, humMin});

                    if (idxNum >= ln.lastCalculatedHourIndex - 1) {
                        emitter.stop();
                        resolve(records);
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    async getLastHourData() {
        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_LAST_HOUR_HIST);

        const idxNum = value.getUint32(0, true);
        const timestamp = value.getUint32(4, true);
        const tempRowMax = value.getInt16(8, true) / 100;
        const humMax = value.getUint8(10);
        const tempRowMin = value.getInt16(11, true) / 100;
        const humMin = value.getUint8(13);

        return {idxNum, timestamp, tempRowMax, humMax, tempRowMin, humMin};
    }

    async getLastCalculatedHourIndexAndNextIndex() {
        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_LAST_HIST);

        const lastCalculatedHourIndex = value.getUint32(0, true);
        const nextIndex = value.getUint32(2, true);

        console.log('Last calculated hour index:', lastCalculatedHourIndex);
        console.log('Next index:', nextIndex);

        return {
            lastCalculatedHourIndex,
            nextIndex
        };
    }

}