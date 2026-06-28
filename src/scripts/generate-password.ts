import bcrypt from 'bcrypt';

// The plaintext password to hash (must be provided explicitly)
const password = process.argv[2];

if (!password) {
  console.error('Usage: ts-node generate-password.ts <password>');
  console.error('Provide the plaintext password to hash as the first argument.');
  process.exit(1);
}

if (password === 'password123') {
  console.error(
    "Refusing to hash the well-known insecure password 'password123'. Choose a stronger password."
  );
  process.exit(1);
}

// Hash the password
async function hashPassword() {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Password Hash Generator');
    console.log('-----------------------');
    console.log(`Hashed Password: ${hashedPassword}`);
    console.log();
    console.log('For use in users.json:');
    console.log(`"passwordHash": "${hashedPassword}"`);
  } catch (error) {
    console.error('Error hashing password:', error);
    // Signal failure to callers; hashPassword() is invoked without await below.
    process.exitCode = 1;
  }
}

hashPassword();
