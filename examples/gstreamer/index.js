import {WebXRButton} from './js/util/webxr-button.js';
import {Scene} from './js/render/scenes/scene.js';
import {Renderer, createWebGLContext} from './js/render/core/renderer.js';
import {UrlTexture} from './js/render/core/texture.js';
import {ButtonNode} from './js/render/nodes/button.js';
import {Gltf2Node} from './js/render/nodes/gltf2.js';
import {VideoNode} from './js/render/nodes/videoreverse.js';
import {InlineViewerHelper} from './js/util/inline-viewer-helper.js';
import {QueryArgs} from './js/util/query-args.js';
import {vec3, vec4, mat3, mat4, quat, quat2} from './js/render/math/gl-matrix.js';

// If requested, use the polyfill to provide support for mobile devices
// and devices which only support WebVR.
// import WebXRPolyfill from './js/third-party/webxr-polyfill/build/webxr-polyfill.module.js';
// if (QueryArgs.getBool('usePolyfill', true)) {
// let polyfill = new WebXRPolyfill();
// }

let inlineSession = null;
let fov = document.getElementById('vertFOV');
let fovLabel = document.getElementById('vertFOVLabel');
let radPerDegree = (Math.PI / 180);
function updateFov() {
    let value = parseFloat(fov.value);
    // The inlineVerticalFieldOfView is specified in radians.
    let radValue = value * (Math.PI / 180);

    if (inlineSession) {
        // As with any values set with updateRenderState, this will take
        // effect on the next frame.
        inlineSession.updateRenderState({
            inlineVerticalFieldOfView: radValue
        });
    }
    
    // Set the label on the page
    let label = `Vertical FOV: ${value} degrees`;
    if (value == 90) {
        label += ' (default)';
    }
    fovLabel.textContent = label;
}
fov.addEventListener('change', updateFov);


let autoplayCheckbox = document.getElementById('autoplayVideo');

// XR globals.
let xrButton = null;
let xrImmersiveRefSpace = null;
let inlineViewerHelper = null;

// WebGL scene globals.
let gl = null;
let renderer = null;
let scene = new Scene();
// scene.addNode(new Gltf2Node({url: 'media/gltf/home-theater/home-theater.gltf'}));
scene.enableStats(false);

let video = document.createElement('video');
video.loop = true;
// video.id = 'video';
video.src = 'cdshort.mp4';
// video.src = 'media/video/bbb-sunflower-540p2-1min.webm';

let videoNode = new VideoNode({
    video: video,
    displayMode: displayMode || 'mono' // 'stereoTopBottom'
});

// When the video is clicked we'll pause it if it's playing.
videoNode.onSelect(() => {
    if (!video.paused) {
        playButton.visible = true;
        video.pause();
    } else {
        playButton.visible = false;
        video.play().then(() => {
            console.log(`Video play actually started.`);
        });;
    }
});
videoNode.selectable = true;

// Move back to the position of the in-room screen and size to cover it.
// Values determined experimentally and with many refreshes.
// videoNode.translation = [0.025, 0.275, -4.4];
// videoNode.scale = [2.1, 1.1, 1.0];
videoNode.translation = [0, 0.7, -1.5];
videoNode.scale = [1, 1, 1.0];
scene.addNode(videoNode);
initVideo(video);

video.addEventListener('loadeddata', () => {
    // Once the video has loaded up adjust the aspect ratio of the "screen"
    // to fit the video's native shape.
    let aspect = videoNode.aspectRatio;
    if (aspect < 2.0) {
        videoNode.scale = [aspect * 1, 1, 1.0];
    } else {
        // videoNode.scale = [2.1, 2.1 / aspect, 1.0];
        videoNode.scale = [1, 1 / aspect, 1.0];
    }
    videoNode.rotation = [0, 0, 0, 0];
});

// Add a button to the scene to play/pause the movie.
let playTexture = new UrlTexture('media/textures/play-button.png');

// Create a button that plays the video when clicked.
let playButton = new ButtonNode(playTexture, () => {
    // Play the video and hide the button.
    if (video.paused) {
        playButton.visible = false;
        video.play().then(() => {
	          console.log(`Video play actually started.`);
	      });
    }
});
// Move the play button to the center of the screen and make it much
// bigger.
// playButton.translation = [0.025, 0.275, -4.2];
// playButton.scale = [5.0, 5.0, 5.0];
playButton.translation = [0.1, 0.57, -1.95];
playButton.scale = [4.0, 4.0, 4.0];
scene.addNode(playButton);

function initXR() {
    xrButton = new WebXRButton({
        onRequestSession: onRequestSession,
        onEndSession: onEndSession
    });
    document.querySelector('header').appendChild(xrButton.domElement);

    if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
            xrButton.enabled = supported;
        });

        navigator.xr.requestSession('inline').then((session) => {
            inlineSession = session;
            onSessionStarted(session);
            updateFov();
        });
    }
}

function initGL() {
    if (gl)
        return;

    gl = createWebGLContext({
        xrCompatible: true
    });
    document.body.appendChild(gl.canvas);

    function onResize() {
        gl.canvas.width = gl.canvas.clientWidth * window.devicePixelRatio;
        gl.canvas.height = gl.canvas.clientHeight * window.devicePixelRatio;
    }
    window.addEventListener('resize', onResize);
    onResize();

    renderer = new Renderer(gl);
    scene.setRenderer(renderer);
}

function onRequestSession() {
    let autoplay = autoplayCheckbox.checked;

    let pending;

    if (autoplay) {
        playButton.visible = false;
        // If we want the video to autoplay when the session has fully started
        // (which may be several seconds after the original requestSession
        // call due to clicking through consent prompts or similar) then we
        // need to start the video within a user activation event first
        // (which this function is.) Once it's been started successfully we
        // pause it, at which point we can resume it pretty much whenever we'd
        // like.
        pending = video.play().then(() => {
            console.log(`Video play actually started.`);
            video.pause();
        });
    }

    return navigator.xr.requestSession('immersive-vr', {
        requiredFeatures: ['local-floor']
    }).then((session) => {
        xrButton.setSession(session);
        session.isImmersive = true;
        onSessionStarted(session);

        if (autoplay) {
            pending.then(() => {
                video.play().then(() => {
                    console.log(`Video play actually started.`);
	              });
            });
        }
    });
}

let xrSession;
let inputSourceList;
let leftHandSource;
let rightHandSource;
function onSessionStarted(session) {
    xrSession = session;
    session.addEventListener('end', onSessionEnded);
    session.addEventListener('select', (ev) => {
        let refSpace = ev.frame.session.isImmersive ?
            xrImmersiveRefSpace :
            inlineViewerHelper.referenceSpace;
        scene.handleSelect(ev.inputSource, ev.frame, refSpace);
    });
    inputSourceList = xrSession.inputSources;
    console.log(inputSourceList);
    xrSession.addEventListener("inputsourceschange", event => {
        inputSourceList = event.session.inputSources;
        inputSourceList.forEach(source => {
            switch(source.handedness) {
            case "left":
                leftHandSource = source;
                console.log(`leftHandSource`, source);
                break;
            case "right":
                rightHandSource = source;
                console.log(`rightHandSource`, source);
                break;
            }
        });
    });
    
    initGL();
    scene.inputRenderer.useProfileControllerMeshes(session);

    let glLayer = new XRWebGLLayer(session, gl);
    session.updateRenderState({ baseLayer: glLayer });

    // In this case we're going to use an 'local' frame of reference
    // because we want to users head to appear in the right place relative
    // to the center chair, as if they're sitting in it, rather than
    // somewhere in the room relative to the floor.
    let refSpaceType = session.isImmersive ? 'local' : 'viewer';
    session.requestReferenceSpace(refSpaceType).then((refSpace) => {
        if (session.isImmersive) {
            xrImmersiveRefSpace = refSpace;
        } else {
            inlineViewerHelper = new InlineViewerHelper(gl.canvas, refSpace);
        }

        // session.requestAnimationFrame(onXRFrame);
        fixPosition();
    });
}

function onEndSession(session) {
    session.end();
}

function onSessionEnded(event) {
    if (event.session.isImmersive) {
        xrButton.setSession(null);
        video.pause();
    }
}

function fixPosition() {
    xrSession.requestReferenceSpace("viewer")
	      .then((refSpace) => {
	          let xrReferenceSpace = refSpace;
	          xrReferenceSpace = xrReferenceSpace.getOffsetReferenceSpace(
                new XRRigidTransform({x:0, y:0, z:-4.0, w: 1.0}));
            xrSession.referenceSpace = xrReferenceSpace;
            xrSession.requestAnimationFrame(onXRFrame);
	      });
}

let lastRY = 0;
let amode = true;
let bmode = false;
let lr = 0;
let ud = 0;
let zoom = 0;
let panStep = 0.005;
let zoomStep = 0.05;
function onXRFrame(t, frame) {
    let session = frame.session;
    let refSpace = session.isImmersive ?
        xrImmersiveRefSpace :
        inlineViewerHelper.referenceSpace;

    scene.startFrame();

    let pose = frame.getViewerPose(refSpace);
    if (session.isImmersive) {
        if (rightHandSource?.gamepad?.buttons[4].pressed) {
            amode = true;
            bmode = false;
        }
        if (rightHandSource?.gamepad?.buttons[5].pressed) {
            amode = false;
            bmode = true;
        }
        if (rightHandSource?.gamepad?.axes[3] > .1) {
            if (amode) {
                lr += panStep;
                console.log(`lr: ${lr}`);
            } else {
                zoom += zoomStep;
                console.log(`zoom: ${zoom}`);
            }
        }
        if (rightHandSource?.gamepad?.axes[3] < -.1) {
            if (amode) {
                lr -= panStep;
                console.log(`lr: ${lr}`);
            } else {
                zoom -= zoomStep;
                console.log(`zoom: ${zoom}`);
            }
        }
        if (rightHandSource?.gamepad?.axes[2] > .1) {
            if (amode) {
                ud += panStep;
            console.log(`ud: ${ud}`);
            } else {
                zoom += zoomStep;
                console.log(`zoom: ${zoom}`);
            }
        }
        if (rightHandSource?.gamepad?.axes[2] < -.1) {
            if (amode) {
                ud -= panStep;
                console.log(`ud: ${ud}`);
            } else {
                zoom -= zoomStep;
                console.log(`zoom: ${zoom}`);
            }
        }
        let rot = pose.transform.orientation;
        let pos = pose.transform.position;
        let matrix = pose.transform.matrix;
        let [x, y, z, w] = [pos.x, pos.y, pos.z, pos.w];
	      let rx = rot.x * 2.1 + lr; // Math.PI;
	      let ry = rot.y * 2.1 - .1 + ud; // Math.PI;
	      let rz = rot.z * 2.1; // Math.PI;
	      let [vx, vy, vz] = [4-zoom, 4-zoom, -4+zoom];
        let [dx, dy, dz] = [0, -0, 0];
        let [rdx, rdy, rdz] = [0, 0, 0];
	      let nx = Math.sin(-(ry+rdy));
	      let ny = Math.sin(rx+rdx);
	      let nz = Math.cos(ry+rdy); // - Math.sin(rx+rdx);
        if (lastRY - ry > 0.01) {
	          console.log(`rot.x: ${rot.x} ${rx}, rot.y: ${rot.y} ${ry}, rot.z: ${rot.z} ${rz}`);
            // console.log(`Trans: x: ${nx} y: ${ny} z: ${nz} pos:`, pos);
        }
        lastRY = ry;
	      // let ny = vy * Math.cos(rx) - vz * Math.sin(rx);
	      // nz = vy * Math.sin(rx) - vz * Math.sin(rx);
        videoNode.origin = pos;
        // videoNode.translation = [x, y, z-2, 0];
        videoNode.translation = [x + nx * vx + dx, y + ny * vy + dy, z + nz * vz + dz, 0];
        // videoNode.translation = [0, 0, -5];
        // let offz = session.isImmersive ? 5 : 0;
        /*
          videoNode.translation = [Math.cos(rot.y) * offz * Math.cos(rot.z),
          Math.cos(rot.x) * offz * Math.cos(rot.z),
          Math.cos(rot.x) * -offz * Math.cos(rot.y)];
        */
	      videoNode.rotation = [rot.x, rot.y, rot.z, rot.w];
	      // quat.fromMat3(videoNode.rotation, [rot.x, rot.y, rot.z]);
    }
    session.requestAnimationFrame(onXRFrame);
    scene.updateInputSources(frame, refSpace);
    scene.drawXRFrame(frame, pose);
    scene.endFrame();
}

function onXRFrameOK(t, frame) {
    let session = frame.session;
    let refSpace = session.isImmersive ?
        xrImmersiveRefSpace :
        inlineViewerHelper.referenceSpace;

    scene.startFrame();

    let pose = frame.getViewerPose(refSpace);
    if (session.isImmersive) {
        let rot = pose.transform.orientation;
        let pos = pose.transform.position;
        let matrix = pose.transform.matrix;
	      let halfMeterTransform = new XRRigidTransform({
            x: 0, y: 0, z: 2, w: 1.0
	      });
        let [x, y, z, w] = [pos.x, pos.y, pos.z, pos.w];
	      let rx = rot.x * 2.2; // Math.PI;
	      let ry = rot.y * 2.2 + -.1; // Math.PI;
	      let rz = rot.z * 2.2; // Math.PI;
	      let [vx, vy, vz] = [4, 4, -4];
        let [dx, dy, dz] = [0, -0, 0];
        let [rdx, rdy, rdz] = [0, 0, 0];
	      let nx = Math.sin(-(ry+rdy));
	      let ny = Math.sin(rx+rdx);
	      let nz = Math.cos(ry+rdy); // - Math.sin(rx+rdx);
        if (lastRY - ry > 0.01) {
	          console.log(`rot.x: ${rot.x}, rot.y: ${rot.y}, rot.z: ${rot.z}`);
            // console.log(`Trans: x: ${nx} y: ${ny} z: ${nz} pos:`, pos);
        }
        lastRY = ry;
	      // let ny = vy * Math.cos(rx) - vz * Math.sin(rx);
	      // nz = vy * Math.sin(rx) - vz * Math.sin(rx);
        videoNode.origin = pos;
        // videoNode.translation = [x, y, z-2, 0];
        videoNode.translation = [x + nx * vx + dx, y + ny * vy + dy, z + nz * vz + dz, 0];
        // videoNode.translation = [0, 0, -5];
        // let offz = session.isImmersive ? 5 : 0;
        /*
          videoNode.translation = [Math.cos(rot.y) * offz * Math.cos(rot.z),
          Math.cos(rot.x) * offz * Math.cos(rot.z),
          Math.cos(rot.x) * -offz * Math.cos(rot.y)];
        */
	      videoNode.rotation = [rot.x, rot.y, rot.z, rot.w];
	      // quat.fromMat3(videoNode.rotation, [rot.x, rot.y, rot.z]);
    }
    session.requestAnimationFrame(onXRFrame);
    scene.updateInputSources(frame, refSpace);
    scene.drawXRFrame(frame, pose);
    scene.endFrame();
}


// Start the XR application.
initXR();

function initVideo(videoElement) {
    function jsonRpc(payload, cb) {
	      console.log(`jsonRpc called:`, payload);
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function(data) {
	          console.log(`RPS response`, data);
            if (this.readyState == 4 && this.status == 200) {
                cb(this.responseText);
            }
        };
        xhttp.open('POST', '/api');
        xhttp.setRequestHeader('Content-Type', 'application/json');
        xhttp.send(JSON.stringify(payload));
    }
    let pc = new RTCPeerConnection({
        rtcpMuxPolicy: 'require', bundlePolicy: 'max-bundle',
        iceServersHide: [{urls: 'stun:w5.lig.net:3478'}],
        iceServers: [{urls: 'stun:w5.lig.net:3478'}, {urls: 'stun:lig.net:3478'}, {urls: 'turn:w5.lig.net:3478', username: 'forged', credential: 'droids'}, {urls: 'turn:lig.net:3478', username: 'forged', credential: 'droids'}]
    });
    let log = msg => {
        console.log(msg);
    };

    pc.ontrack = function (event) {
        console.log(`ontrack: Playing`);
        // var el = document.getElementById('video');
        var el = videoElement; // document.getElementById('video');
        el.srcObject = event.streams[0];
        el.id = event.streams[0].id;
	      // el.id = 'video';
        el.autoplay = true;
        el.controls = true;
        el.muted = true;
	      el.playsinline = true;
	      el.webkitPlaysinline = true;
        el.addEventListener("click", function() {
	          el.muted = !el.muted;
	          // el.play();
	      });
	      el.onloadedmetadata = () => { el.play().then(() => {
            console.log(`Video play actually started.`);
	      });
	                                  };
	      // el.webkitPlaysinline = true;
        // el.addEventListener("click", function() { el.play(); });
    };

    pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);
    function jsonRpcHandle(result) {
        let sdp = JSON.parse(result).result;
        if (sdp === '') {
            return alert('Session Description must not be empty');
        }
        try {
            let sdps = JSON.parse(atob(sdp));
            console.log(`SDP:`, sdps);
            pc.setRemoteDescription(new RTCSessionDescription(sdps));
        } catch (e) {
            alert(e);
        }
    }
    pc.onicecandidate = event => {
        if (event.candidate === null) {
	          console.log(event);
            var lines = pc.localDescription.sdp.split('\n');
            for(let i = 0; i < lines.length; i++) {
                // remove candidate which libnice cannot parse.
                if (lines[i].search('candidate') != -1 && lines[i].search('local') != -1) {
                    lines.splice(i, 1);
                    i--;
                }
            }
            let sdp = lines.join('\n');
	          console.log(`Sending SDP: ${sdp}`);
            var payload = {"jsonrpc": "2.0", "method": "call", "params": btoa(sdp)};
            jsonRpc(payload, jsonRpcHandle);
        }
    };
    pc.addTransceiver('video', {'direction': 'sendrecv'})
    let options = {
        offerToReceiveVideo: true,
        offerToReceiveAudio: true,
    };
    pc.createOffer().then(d => {
        console.log(`createOffser:`, d);
        pc.setLocalDescription(d);
    }).catch(log);
    window.startSession = () => {
        let sd = document.getElementById('remoteSessionDescription').value;
    }
};
