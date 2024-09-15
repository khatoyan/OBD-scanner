const obdServiceUuid = '0000ffe0-0000-1000-8000-00805f9b34fb'; // Service UUID for many ELM327 devices
const obdCharacteristicUuid = '0000ffe1-0000-1000-8000-00805f9b34fb'; // Characteristic UUID for many ELM327 devices

const connectButton = document.getElementById('connect');
const output = document.getElementById('output');

connectButton.addEventListener('click', async () => {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [obdServiceUuid] }],
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(obdServiceUuid);
    const characteristic = await service.getCharacteristic(obdCharacteristicUuid);

    const obdReader = new OBDReader(characteristic);

    // Инициализация ELM327
    await obdReader.send('ATZ');  // Reset command
    await obdReader.send('ATE0'); // Turn off Echo

    // Пример команды для запроса RPM (010C) и её обработка
    obdReader.send('010C')
      .then(response => {
        output.textContent = `Engine RPM: ${parseRPM(response)}`;
      })
      .catch(error => {
        console.error('Error:', error);
        output.textContent = `Error: ${error}`;
      });

      obdReader.send('x0a')
      .then(response => {
        output.textContent += `\n\nFuel RPM: ${parseRPM(response)}`;
      })
      .catch(error => {
        console.error('Error:', error);
        output.textContent += `\n\nError: ${error}`;
      });
  } catch (error) {
    console.error('Connection failed!', error);
    output.textContent = `Connection failed: ${error}`;
  }
});

class OBDReader {
  constructor(characteristic) {
    this.characteristic = characteristic;
  }

  async send(command) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Отправить команду
    const commandWithCR = command + '\r';
    await this.characteristic.writeValue(encoder.encode(commandWithCR));
    
    // Дождаться ответа
    const response = await this.characteristic.readValue();
    
    // Очистить и декодировать ответ
    let responseString = '';
    for (let i = 0; i < response.byteLength; i++) {
      responseString += String.fromCharCode(response.getUint8(i));
    }

    return responseString.trim();
  }
}

function parseRPM(data) {
  const bytes = data
    .split(' ')
    .map(byte => parseInt(byte, 16))
    .filter(byte => !isNaN(byte));
  
  if (bytes.length >= 2) {
    return ((bytes[0] * 256) + bytes[1]) / 4;
  } else {
    throw new Error('Invalid RPM response');
  }
}