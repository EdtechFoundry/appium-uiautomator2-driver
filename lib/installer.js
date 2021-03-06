import path from 'path';
import { fs } from 'appium-support';
import request from 'request-promise';
import log from './logger';
import crypto from 'crypto';

/**
 * UI2_VER, SERVER_DOWNLOAD_SHA512, SERVER_TEST_DOWNLOAD_SHA512 should be updated for every appium-uiautomator2-server release.
 */
const UI2_VER = "v0.0.5";
const SERVER_DOWNLOAD_SHA512 = "0df3eb4eb681d3b18071b84f771c280b048c1e0dbe022c4153b19d7142ef54a192cd0cb24c1a0747ee978a2e8e72df6549418ad89b0edaa4be0e1b9d8834f793";
const SERVER_TEST_DOWNLOAD_SHA512 = "2523fc9edd99fb580b3f9f46e29cd4c5f1f4fc3d9d30d5b5d4d7745fa97c2d8bbd0f2de6aedd87339a72fb1bc65db5de6e7fcb6c5dfa86836e8159bf2a0a23da";


const UI2_SERVER_DOWNLOAD = `https://github.com/appium/appium-uiautomator2-server/releases/download` +
    `/${UI2_VER}/appium-uiautomator2-server-${UI2_VER}.apk`;
const UI2_SERVER_TEST_DOWNLOAD = `https://github.com/appium/appium-uiautomator2-server/releases/download` +
    `/${UI2_VER}/appium-uiautomator2-server-debug-androidTest.apk`;
const UI2_DIR = path.resolve(__dirname, "..", "..", "uiautomator2");
const UI2_SERVER_APK_PATH = path.resolve(UI2_DIR, `appium-uiautomator2-server-${UI2_VER}.apk`);
const UI2_TEST_APK_PATH = path.resolve(UI2_DIR, `appium-uiautomator2-server-debug-androidTest.apk`);



async function setupUiAutomator2 () {
  if (await hashCheck(UI2_SERVER_APK_PATH, SERVER_DOWNLOAD_SHA512) && await hashCheck(UI2_TEST_APK_PATH, SERVER_TEST_DOWNLOAD_SHA512)) {
    log.info("UiAutomator2 apk exists and has correct hash, skipping download");
    return;
  } else {
    await downloadUiAutomator2ServerApk();
  }

  if (!(await serverExists())) {
    throw new Error("Something went wrong in setting up UiAutomator2");
  }
}

async function hashCheck (fileName, SHA512) {
  if (await fs.exists(fileName)) {
    var buffer = require("fs").readFileSync(fileName);
    let fingerprint =  await sha512(buffer);
    return fingerprint === SHA512;
  } else {
    return false;
  }
}

async function downloadUiAutomator2ServerApk () {

  await fs.mkdir(UI2_DIR);
  log.info(`downloading UiAutomator2 Server APK ${UI2_VER} : ${UI2_SERVER_DOWNLOAD}`);
  log.info(`downloading UiAutomator2 Server test APK ${UI2_VER} : ${UI2_SERVER_TEST_DOWNLOAD}`);
  let serverApk = await request.get({url: UI2_SERVER_DOWNLOAD, encoding: null});
  let serverTestApk = await request.get({url: UI2_SERVER_TEST_DOWNLOAD, encoding: null});
  if (!serverApk instanceof Buffer ) {
    throw new Error(Object.prototype.toString.call(serverApk));
  }
  if (!serverTestApk instanceof Buffer ) {
    throw new Error(Object.prototype.toString.call(serverTestApk));
  }
  let serverFingerprint = await sha512(serverApk);
  let serverTestFingerprint = await sha512(serverTestApk);

  if ( serverFingerprint !== SERVER_DOWNLOAD_SHA512 ) {
    log.errorAndThrow(`bad Server SHA512 fingerprint: ${serverFingerprint}`);
    log.error("Stopping the installation" );
    return;
  }
  if ( serverTestFingerprint !== SERVER_TEST_DOWNLOAD_SHA512 ){
    log.errorAndThrow(`bad Server test SHA512 fingerprint: ${serverTestFingerprint}`);
    log.error("Stopping the installation");
    return;
  }
  await fs.writeFile(UI2_SERVER_APK_PATH, serverApk, {encoding: 'binary'});
  await fs.writeFile(UI2_TEST_APK_PATH, serverTestApk, {encoding: 'binary'});

  await fs.chmod(UI2_SERVER_APK_PATH, 0o0644);
  await fs.chmod(UI2_TEST_APK_PATH, 0o0644);

  log.info("UiAutomator2 Server APKs downloaded");
}

async function sha512 (buffer) {
  const hash = crypto.createHash('sha512');
  return hash.update(buffer).digest('hex');
}

async function serverExists () {
  try {
    return (await fs.exists(UI2_SERVER_APK_PATH) &&
    await fs.exists(UI2_TEST_APK_PATH));
  } catch (e) {
    if (e.code.indexOf("ENOENT") !== -1) {
      return false;
    }
    throw e;
  }
}

export { setupUiAutomator2, serverExists, UI2_SERVER_APK_PATH, UI2_TEST_APK_PATH, UI2_VER };
