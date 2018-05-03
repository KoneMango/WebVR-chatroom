/*global THREE:true*/
/*global WebVR:true*/
import VRPage from '@/core/js/VRPage';
import UserRTC from '@/utils/rtc';
import {Listener,Speaker} from '@/utils/audio';
import '@/lib/GLTFLoader';
class Chatroom extends VRPage {
    assets() {
        return {
            MODEL_ROBOT: 'model/astronaut/Astronauta_model.gltf',
            MODEL_ROOM: 'model/medieval_castle_with_village/scene.gltf',
            // TEXTURE_SKYBOX: 'texture/360bg.jpg'
        };
    }
    start() {
        this.roleSet = {};
        const { MODEL_ROOM, MODEL_ROBOT } = this.assets;
        this.addRoom(MODEL_ROOM);
        // this.addRole(MODEL_ROBOT);
        // this.addButton({
        //     index: -1,
        //     text: 'Exit',
        //     callback: () => {
        //         WebVR.Router.back();
        //     }
        // });
        this.addDirectLight();
        const url = 'ws://127.0.0.1:8086';
        this.userRtc = new UserRTC({
            url,
            IJoin: this.addRoles.bind(this),
            otherJoin: this.addOtherRole.bind(this),
            receiveRoleInfo: this.updateOtherRole.bind(this),
            peerConnected: this.addRoleAudio.bind(this),
            peerDisconnected: this.removeOtherRole.bind(this)
        });
        // this.audioCtx = new AudioContext();
        // this.listener = new Listener(this.audioCtx);
    }
    loaded() {
        // play the sound
        //  this.envSound.play();
    }
    async addRoles({roleData,otherDataList}) {
        const { MODEL_ROBOT } = this.assets;
        this.myRole = await this.addRole(MODEL_ROBOT,roleData);
        this.me = new THREE.Group();
        this.me.add(WebVR.Camera);
        WebVR.Scene.add(this.me);
        this.me.position.set(this.myRole.position.x,this.myRole.position.y,this.myRole.position.z);
        otherDataList.forEach(({userId,roleData}) => {
            this.addOtherRole({userId,roleData});
        });
    }
    async addOtherRole({userId,roleData}) {
        const { MODEL_ROBOT } = this.assets;
        const role = await this.addRole(MODEL_ROBOT,roleData,userId);
        this.roleSet[userId] = { model: role };
    }
    updateOtherRole({userId,roleData}) {
       const {model,speaker} = this.roleSet[userId];
       if (!model) return;
       model.position.set(roleData.position.x,roleData.position.y,roleData.position.z);
       model.rotation.set(roleData.rotation.x,roleData.rotation.y,roleData.rotation.z);
       if(speaker) speaker.update(roleData.position);
    }
    removeOtherRole(userId) {
        const {model} = this.roleSet[userId];
        if (!model) return;
        WebVR.Scene.remove(model);
        delete this.roleSet[userId];
    }
    addRole(MODEL_ROBOT,roleData) {
        return new Promise(resolve => {
            const loader = new THREE.GLTFLoader();
            // loader.setPath(PATH);
            const {position,rotation} = roleData;
            loader.load(MODEL_ROBOT, data => {
                const object3d = data.scene;
                const role = new THREE.Group();
                role.add(object3d);
                // object3d.position.set(0,-4,-2);
                object3d.position.set(0,-2,-8);
                object3d.rotation.set(0,Math.PI,0);
                role.position.set(position.x,position.y,position.z);
                role.rotation.set(rotation.x,rotation.y,rotation.z);
                WebVR.Scene.add(role);
                resolve(role);
            });
        });
    }
    _addRole(MODEL_ROBOT,roleData,userId) {
        return new Promise(resolve => {
            const {position,rotation} = roleData;
            const geometry = new THREE.CubeGeometry(2,2,2);
            const material = new THREE.MeshLambertMaterial({
                map: this.getTexture({
                    text: userId,
                    backgroundColor: '#dddddd',
                    fontColor: '#00aadd',
                    fontSize: '50',
                    width: 512,
                    height: 512
                })
            });
            const model = new THREE.Mesh(geometry,material);
                model.position.set(position.x,position.y,position.z);
                model.rotation.set(rotation.x,rotation.y,rotation.z);
                WebVR.Scene.add(model);
                resolve(model);
        });
    }
    addRoom(MODEL_ROOM) {
        const loader = new THREE.GLTFLoader();
        // loader.setPath(PATH);
        loader.load(MODEL_ROOM, data => {
            const room = data.scene;
            room.scale.set(1,1,1);
            room.position.set(0,-10,0);
            WebVR.Scene.add(room);
            this.room = room;
        });
    }
    addPanorama(radius, path) {
        // create panorama
        const geometry = new THREE.SphereGeometry(radius, 50, 50);
        const material = new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load(path), side: THREE.BackSide });
        const panorama = new THREE.Mesh(geometry, material);
        WebVR.Scene.add(panorama);
    }
    addEnvAudio(path) {
        // instantiate audio object
        this.envSound = new THREE.Audio(WebVR.AudioListener);

        // add the audio object to the scene
        WebVR.Scene.add(this.envSound);
        // instantiate a loader
        const loader = new THREE.AudioLoader();

        // load a resource
        loader.load(
            // resource URL
            path,
            // Function when resource is loaded
            audioBuffer => {
                // set the audio object buffer to the loaded object
                this.envSound.setBuffer(audioBuffer);
                this.envSound.setLoop(true);
            }
        );
    }
    addDirectLight() {
        // create the enviromental light
        WebVR.Scene.add(new THREE.AmbientLight(0xFFFFFF));
        let light = new THREE.DirectionalLight(0xffffff, 0.3);
        light.position.set(50, 50, 50);
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 512;
        light.shadow.camera.near = 100;
        light.shadow.camera.far = 1200;
        light.shadow.camera.left = -1000;
        light.shadow.camera.right = 1000;
        light.shadow.camera.top = 350;
        light.shadow.camera.bottom = -350;
        WebVR.Scene.add(light);
        return light;
    }
    getTexture({
        text, 
        backgroundColor,
        fontSize,
        fontColor,
        width,
        height
    }) {
        let canvas = document.createElement('canvas');
        canvas.width = width, canvas.height = height;
        let ctx = canvas.getContext('2d');
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = fontColor;
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
        let texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    addButton({ text, index, fontSize = 64, callback = () => { } }) {
        const option = {
            hover: 5,
            camera: WebVR.Camera,
            radius: 25,
            angle: Math.PI / 6 * index,
            width: 10,
            height: 7.5
        };
        let hx = option.hover * Math.sin(option.angle), hz = option.hover * Math.cos(option.angle);
        let geometry = new THREE.PlaneGeometry(option.width, option.height);
        let material = new THREE.MeshBasicMaterial({ map: this.getTexture(text, 32), opacity: 0.75, transparent: true });
        let button = new THREE.Mesh(geometry, material);
        let cx = option.camera.position.x,
            cy = option.camera.position.y,
            cz = option.camera.position.z;
        let dx = option.radius * Math.sin(option.angle),
            dz = option.radius * Math.cos(option.angle);
        button.position.set(cx + dx, cy, cz - dz);
        button.rotation.y = -option.angle;

        WebVR.Scene.add(button);
        WebVR.Gazer.on(button, 'gazeEnter', m => {
            button.scale.set(1.2, 1.2, 1.2);
            WebVR.CrossHair.animate.loader.start();
        });
        WebVR.Gazer.on(button, 'gazeLeave', m => {
            button.scale.set(1, 1, 1);
            WebVR.CrossHair.animate.loader.stop();
        });
        WebVR.Gazer.on(button, 'gazeWait', m => {
            WebVR.CrossHair.animate.loader.stop();
            callback();
        });
    }
    addRoleAudio({userId,stream}) { // 加入声音
        const {audioCtx} = this;
        // // create the PositionalAudio object (passing in the listener)
        var sound = new THREE.PositionalAudio( WebVR.AudioListener );
        // // const audioCtx = THREE.AudioContext.getContext();
        // var url = URL.createObjectURL(stream);
        // var audio = new Audio(url);
        // // audio.autoplay = true;
        const source = sound.context.createMediaStreamSource(stream);
        // // load a sound and set it as the PositionalAudio object's buffer
        sound.setNodeSource(source);
        sound.autoplay = true;
        // const role = this.roleSet[userId];
        // // finally add the sound to the mesh
        // role.add( sound );
        
        // this.roleSet[userId].speaker = new Speaker(audioCtx,stream);
    }
    updateMyRole() { // 更新自己的角色行为
        if (!this.myRole) return;
        const role = this.myRole;
        this.setRoleRotation(role,role.rotation);
        // 
        this.userRtc.sendRoleInfo({
            rotation: { x: role.rotation.x, y: role.rotation.y, z: role.rotation.z },
            position: { x: role.position.x, y: role.position.y, z: role.position.z },
        });
        // this.listener.update(role.position,role.quaternion);
    }
    setRoleRotation(role,rotation) {
        const head = role.getObjectByName( "Armature" );
        // role.rotation.x = WebVR.Camera.rotation.x;
        role.rotation.y = WebVR.Camera.rotation.y;
        // role.rotation.z = WebVR.Camera.rotation.z;
    }
    update() {
        this.updateMyRole();
        // if(this.ball)this.ball.rotation.set(WebVR.Camera.rotation.x,WebVR.Camera.rotation.y,WebVR.Camera.rotation.z);
    }
}
export default Chatroom;