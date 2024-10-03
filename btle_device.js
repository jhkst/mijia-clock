export class BTLEDevice {

    constructor(device) {
        this.device = device;
        this.services = {};
    }

    getName() {
        throw new Error('getName not implemented');
    }

    setDevice(device) {
        this.device = device;
    }

    static isAvailable() {
        return !!navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function';
    }

    isSuitableDevice(device) {
        return device.name === this._requestFilter().name;
    }

    isConnected() {
        return this.device && this.device.gatt.connected;
    }

    async requestAndConnect() {
        if (!this.device) {
            await this.request();
        }
        if (!this.device.gatt.connected) {
            await this.connect();
        }
    }
    
    async request() {
        this.device = await navigator.bluetooth.requestDevice({
            filters: [this._requestFilter()],
            optionalServices: this._requestServices()
        });
    }

    /* abstract */
    _requestFilter() {
        throw new Error('_requestFilter not implemented');
    }

    /* abstract */
    _requestServices() {
        throw new Error('_requestServices not implemented');
    }

    /* abstract */
    image() {
        return null;
    }

    async connect() {
        this.server = await this.device.gatt.connect();
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }
        this.services = {};
    }

    getDeviceName() {
        return this.device.name;
    }

    getDeviceId() {
        return this.device.id;
    }

    async _getCharacteristics(serviceUuid, characteristicUuid) {
        if (!this.server || !this.server.connected) {
            throw new Error('Not connected');
        }
        
        serviceUuid = serviceUuid.toLowerCase();
        characteristicUuid = characteristicUuid.toLowerCase();

        if (!this.services[serviceUuid]) {
            this.services[serviceUuid] = await this.server.getPrimaryService(serviceUuid);
        }
        return await this.services[serviceUuid].getCharacteristic(characteristicUuid);
    }

    async _getCharacteristicValue(serviceUuid, characteristicUuid) {
        const characteristic = await this._getCharacteristics(serviceUuid, characteristicUuid);
        return await characteristic.readValue();
    }

    async _setCharacteristicValue(serviceUuid, characteristicUuid, value) {
        const characteristic = await this._getCharacteristics(serviceUuid, characteristicUuid);
        return await characteristic.writeValue(value);
    }

    async _getNotifiedValue(serviceUuid, characteristicUuid) {
        const characteristic = await this._getCharacteristics(serviceUuid, characteristicUuid);
        return new Promise((resolve, reject) => {
            const handleCharacteristicValueChanged = async (event) => {
                try {
                    const value = event.target.value;
                    characteristic.stopNotifications().catch(console.error);
                    characteristic.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
                    resolve(value);
                } catch (error) {
                    reject(error);
                }
            }

            characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

            return characteristic.startNotifications();
        });
    }

    async _getNotifiedValueEventEmitter(serviceUuid, characteristicUuid) {
        const characteristic = await this._getCharacteristics(serviceUuid, characteristicUuid);
        const emitter = new EventEmitter();

        const handleCharacteristicValueChanged = (event) => {
            emitter.emit('value', event.target.value);
        }

        emitter.stop = () => {
            characteristic.stopNotifications().catch(console.error);
            characteristic.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
        };
        
        characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
        characteristic.startNotifications();

        return emitter;
        
    }

}