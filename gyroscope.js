let timestamp,
    gyroscope,
    gyroscopied = { x: 0, y: 0, z: 0, started: false, matrix: m4.identity() },
    alpha = 0,
    beta = 0,
    gamma = 0;
const E = 0.001
const MS2S = 1.0 / 1000.0;
// some constants

function startGyroscope() {
    timestamp = Date.now();
    gyroscope = new Gyroscope();
    gyroscope.addEventListener('reading', () => {
        timestamp = Date.now();
        gyroscopied.x = gyroscope.x
        gyroscopied.y = gyroscope.y
        gyroscopied.z = gyroscope.z
        gyroscopeToRotationMatrix()
    })
    gyroscope.start();
    gyroscope.started = true
}

function getRotationMatrixFromVector(rotationVector) {
    const q1 = rotationVector[0];
    const q2 = rotationVector[1];
    const q3 = rotationVector[2];
    let q0;

    if (rotationVector.length >= 4) {
        q0 = rotationVector[3];
    } else {
        q0 = 1 - q1 * q1 - q2 * q2 - q3 * q3;
        q0 = q0 > 0 ? Math.sqrt(q0) : 0;
    }
    const sq_q1 = 2 * q1 * q1;
    const sq_q2 = 2 * q2 * q2;
    const sq_q3 = 2 * q3 * q3;
    const q1_q2 = 2 * q1 * q2;
    const q3_q0 = 2 * q3 * q0;
    const q1_q3 = 2 * q1 * q3;
    const q2_q0 = 2 * q2 * q0;
    const q2_q3 = 2 * q2 * q3;
    const q1_q0 = 2 * q1 * q0;
    let R = [];
    R.push(1 - sq_q2 - sq_q3);
    R.push(q1_q2 - q3_q0);
    R.push(q1_q3 + q2_q0);
    R.push(0.0);
    R.push(q1_q2 + q3_q0);
    R.push(1 - sq_q1 - sq_q3);
    R.push(q2_q3 - q1_q0);
    R.push(0.0);
    R.push(q1_q3 - q2_q0);
    R.push(q2_q3 + q1_q0);
    R.push(1 - sq_q1 - sq_q2);
    R.push(0.0);
    R.push(0.0);
    R.push(0.0);
    R.push(0.0);
    R.push(1.0);
    return R;
}

function gyroscopeToRotationMatrix() {
    if (gyroscope.started) {
        let dT = (Date.now() - timestamp) * MS2S;

        let omegaMagnitude = Math.sqrt(
            gyroscopied.x * gyroscopied.x +
            gyroscopied.y * gyroscopied.y +
            gyroscopied.z * gyroscopied.z);

        if (omegaMagnitude > E) {
            alpha += gyroscopied.x * dT;
            beta += gyroscopied.y * dT;
            gamma += gyroscopied.z * dT;

            alpha = Math.min(Math.max(alpha, -Math.PI * 0.25), Math.PI * 0.25)
            beta = Math.min(Math.max(beta, -Math.PI * 0.25), Math.PI * 0.25)
            gamma = Math.min(Math.max(gamma, -Math.PI * 0.25), Math.PI * 0.25)
            let deltaRotationVector = [];
            deltaRotationVector.push(alpha);
            deltaRotationVector.push(beta);
            deltaRotationVector.push(gamma);

            gyroscopied.matrix = getRotationMatrixFromVector(deltaRotationVector)
            timestamp = Date.now();

        }

    }
}