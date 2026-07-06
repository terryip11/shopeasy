import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('將以下內容加入 .env.local：\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_CONTACT_EMAIL=admin@example.com');
