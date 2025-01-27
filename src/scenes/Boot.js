import { Scene } from 'phaser';
import { ethers } from 'ethers';


export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load general assets
        this.load.image('background', 'assets/background.png');
        this.load.image('starlight-hollow', 'assets/starlight-hollow.png');
        this.load.image('dream-post', 'assets/dream-post.png');
        this.load.image('glow-stash', 'assets/glow-stash.png');
        this.load.image('glow-pool', 'assets/glow-pool.png');
        this.load.image('glitter-market', 'assets/glitter-market.png');
        this.load.image('twinkle-gate', 'assets/twinkle-gate.png');
        this.load.image('cosmic-clutter', 'assets/cosmic-clutter.png');
        this.load.image('glowpuff', 'assets/glowpuff.png'); // Add glowpuff asset
        this.load.image('topbar', 'assets/topbar.png');
        this.load.image('login', 'assets/login.png');
        this.load.image('logout', 'assets/logout.png');
        this.load.image('glowpuffscounter', 'assets/glowpuffscounter.png');
        this.load.image('starlightid', 'assets/starlightid.png');

        // Load Glitter Market-specific assets
        this.load.image('background-glittermarket', 'assets/background-glittermarket.png');
        this.load.image('glittermarketlogo', 'assets/glittermarketlogo.png');
        this.load.image('elroy', 'assets/elroy.png');
        this.load.image('speechbubble', 'assets/speechbubble.png');
        this.load.image('gm-welcometext', 'assets/gm-welcometext.png');
        this.load.image('exit', 'assets/exit.png');

        // Load Twinkle Gate-specific assets
        this.load.image('background-twinkle-gate-01', 'assets/background-twinkle-gate-01.png');
        this.load.image('twinklegatelogo', 'assets/twinklegatelogo.png');
        this.load.image('e', 'assets/e.png');
        this.load.image('creeble', 'assets/creeble.png');
        this.load.image('battlebutton', 'assets/battlebutton.png');
        this.load.image('leavebutton', 'assets/leavebutton.png');

        // Load Dream Post-specific assets
        this.load.image('background-dreampost', 'assets/background-dreampost.png');
        this.load.image('dreampostlogo', 'assets/dreampostlogo.png');
        this.load.image('dreamballtable', 'assets/dreamballtable.png');
        this.load.image('dreamball', 'assets/dreamball.png');
        this.load.image('dailyrewards', 'assets/dailyrewards.png');
        this.load.image('tasks', 'assets/tasks.png');
        this.load.image('invite', 'assets/invite.png');
        this.load.image('leave', 'assets/leave.png');

        // Load Starlight Hollow-specific assets
        this.load.image('background-starlighthollow', 'assets/background-starlighthollow.png');
        this.load.image('paperdown', 'assets/paperdown.png');
        this.load.image('paperup', 'assets/paperup.png');
        this.load.image('crate', 'assets/crate.png');
        this.load.image('exit', 'assets/exit.png');
        this.load.image('closeButton', 'assets/closeButton.png');
        this.load.audio('starlighthollow-mellow', 'assets/starlighthollow-mellow.mp3');  
        this.load.video('background-starlighthollow', 'assets/background-starlighthollow.mp4', 'loadeddata', false, true);

            // Load assets for GlowPool and other scenes
            this.load.image('background-glowpool', 'assets/background-glowpool.png');
            this.load.image('pcfloat', 'assets/pcfloat.png');
            this.load.image('glowpool-logo', 'assets/glowpool-logo.png');
            this.load.image('floatingdude', 'assets/floatingdude.png');
      
        
    }
    create() {
        this.scene.start('MainMenu'); // Start the Game scene after preloading
    }

}



export default Boot;
