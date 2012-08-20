function PinnballApplication () {
    PinnballApplication.superclass.constructor.apply(this, arguments);
    
    this.isKeyboardEnabled = true;
    this.isMouseEnabled = true;

    var s = cc.Director.sharedDirector.winSize
    
    var debugCanvas = document.createElement("canvas");
    $("#cocos2d-demo").append(debugCanvas);
    $(debugCanvas).addClass("debugcanvas")
    
    debugCanvas.width = $(debugCanvas).parent().width();
    debugCanvas.height = $(debugCanvas).parent().height();
    
    this.world = new b2World(new b2Vec2(0, -10), true);
    //this.world.SetContactListener(new ContactListener());
    
    //setup debug draw
    var debugDraw = new b2DebugDraw()
        debugDraw.SetSprite(debugCanvas.getContext("2d"))
        debugDraw.SetDrawScale(PhysicsNode.physicsScale)
        debugDraw.SetFillAlpha(0.5)
        debugDraw.SetLineThickness(1.0)
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit)
    this.world.SetDebugDraw(debugDraw);
}

PinnballApplication.inherit(cc.Layer, {
    // fixed update Time
    upadtesPerSecond: 60,
    updateTime: 1/60,
    timePassedWithoutUpdate: 0,
    frameSecondTimer: 0,
    frameUpdateCounter: 0,
    
    keyDown: function(event) {
        Input.instance.keysDown[event.keyCode] = true;
    },
    
    keyUp: function(event) {
        Input.instance.keysDown[event.keyCode] = false;
    },


    createMinimalFailCase: function() {
        var flipper = new PhysicsNode();
        flipper.position = new cc.Point(300, 300);
        flipper.rotation = 25;
        flipper.createPhysics(this.world, {boundingBox: new cc.Size(20, 100)});
        this.addChild(flipper);
        
        var pivotPoint = new b2Vec2(flipper.body.GetPosition().x -0.6 , flipper.body.GetPosition().y +1 );
        
        var jointDef = new b2RevoluteJointDef();
        jointDef.Initialize(flipper.body, this.world.GetGroundBody(), pivotPoint);
        jointDef.MaximalForce = 4000
        
        //flipper.mouseJoint = this.world.CreateJoint(mouseDef);
        flipper.joint = this.world.CreateJoint(jointDef);
        
        // called in update loop
        flipper.update = function() {
            PhysicsNode.prototype.update.call(this);
            
            if (Input.instance.keysDown[37]) {            
                this.body.ApplyTorque(200);
            }
            if (Input.instance.keysDown[39]) {
                this.body.ApplyTorque(-200);
            }
        }
                
        this.leftFlipper = flipper;
    },
    
    update: function(dt) {
        
        if (this.paused) {
            return;
        }
        
        // limit impact on heavy lag and tab change
        // avoid spiral of death,
        // where calculating 1sec updates takes longer than 1sec
        if (dt > 1.0) {
            dt = 1.0;
        }

        this.frameSecondTimer += dt;
        this.timePassedWithoutUpdate  += dt;
        
        while (this.timePassedWithoutUpdate >= this.updateTime) {
            this.fixedUpdate(this.updateTime);
            this.timePassedWithoutUpdate -= this.updateTime;
            this.frameUpdateCounter++;
        }
        
        if (this.frameSecondTimer >= 1.0) {
            //console.log("updates per second: " + this.frameUpdateCounter);
            this.frameUpdateCounter = 0;
            this.frameSecondTimer -= 1.0;
        }
        
       this.world.DrawDebugData();
    },
    
    fixedUpdate: function(dt) {
        // TODO do more calculations to get more percise
        this.world.Step(dt, 3);
        this.world.ClearForces();
        
        var body = this.world.GetBodyList();
        while(body) {
        
            // update userdata
            var userData = body.GetUserData();
            
            if (userData) {
                if (userData.update) {
                    userData.update(dt);
                }
                if (userData.destroyed) {
                    userData.destroy();
                }
            }
            body = body.GetNext();
        }

        for (var key in this.onPhysicsUpdatedCallbacks) {
            this.onPhysicsUpdatedCallbacks[key]();
            this.onPhysicsUpdatedCallbacks.splice(0, 1);
        }
    }
})

function runDemo () {

/*    var r = new cc.RemoteImage({url: "../img/background.png", path: "../img/background.png"});
    r.load();
*/
    if (window.location.hash != "#debug") {
        $("svg").hide();
    }
    
    $(".question.unanswered").hide();

    var director = cc.Director.sharedDirector
    director.backgroundColor = "rgb(200,200,200)"
    director.attachInView(document.getElementById('cocos2d-demo'))
    director.displayFPS = true
    
    
    // Disable rightclick
    $("canvas").bind("contextmenu", function(e) {
        e.preventDefault();
    });
    
    // I modified lib/cocos2d-beta2.js to make this work!
    function registerResource(path, mimetype) {
        cc.jah.resources[path] = {data: path, mimetype: mimetype, remote:true};
        director.preloader().addToQueue(path);
    };
    
    //registerResource("../img/background.png", "image/png");
    
    // Wait for the director to finish preloading our assets
    cc.addListener(director, 'ready', function (director) {
        var scene = new cc.Scene
        var app = new PinnballApplication();
        
        PinnballApplication.instance = app;
        
        scene.addChild(app)
        app.createMinimalFailCase();
        app.scheduleUpdate();

        // Run the scene
        director.replaceScene(scene)
    });
    //director.preloader().loaded = 0;
    director.runPreloadScene();
}
