import { BTLEDevice } from '../btle_device.js';

const DEVICE_NAME = 'MJ_HT_V1';
const SERVICE_UUID = '226c0000-6476-4566-7562-66734470666d';
const CH_TEMP_HUM = '226caa55-6476-4566-7562-66734470666d'; // Temperature and Humidity as string "T=29.0 H=52.3"
const CH = '226cbb55-6476-4566-7562-66734470666d'; 

const SERVICE_BATTERY_UUID = '0000180f-0000-1000-8000-00805f9b34fb';
const CH_BATTERY_UUID = '00002a19-0000-1000-8000-00805f9b34fb';

export class LYWSDCGQ_01ZM extends BTLEDevice {

    constructor(device) {
        super(device);
    }

    getName() {
        return 'Xiaomi MiJia LYWSDCGQ/01ZM';
    }

    _requestFilter() {
        return {name: DEVICE_NAME};
    }

    _requestServices() {
        return [SERVICE_UUID, SERVICE_BATTERY_UUID];
    }

    image() {
        return 'lywsdcgq.jpg';
    }

    capabilities() {
        return {
            read: {
                'getTempAndHum': {'temp': {name: 'Temperature', type: 'Number', unit: '°C'}, 'hum': {name: 'Humidity', type: 'Number', unit: '%'}},
                'getBattery': { 'batt': { name: 'Battery', type: 'Number', unit: '%'}},
            },
        };
    }

    async getTempAndHum() {
        const value = await this._getNotifiedValue(SERVICE_UUID, CH_TEMP_HUM);
        const decoder = new TextDecoder('utf-8');
        const decodedValue = decoder.decode(value);
        const temp = parseFloat(decodedValue.match(/T=([\d.]+)/)[1]);
        const hum = parseFloat(decodedValue.match(/H=([\d.]+)/)[1]);
        return {temp, hum};
    }

    async getBattery() {
        const value = await this._getCharacteristicValue(SERVICE_BATTERY_UUID, CH_BATTERY_UUID);
        return {'batt': value.getUint8(0)};
    }
}

