export async function getUserIP(): Promise<string> {
  //  onNewIp - your listener function for new IPs
  return new Promise(resolve => {
    //compatibility for firefox and chrome
    const myPeerConnection =
      window.RTCPeerConnection ||
      (window as any).mozRTCPeerConnection ||
      window.webkitRTCPeerConnection;
    const pc = new myPeerConnection({
        iceServers: []
      }),
      noop = function() {
        //
      },
      localIPs: any = {},
      ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g;

    function iterateIP(ip: string) {
      if (!localIPs[ip]) resolve(ip);
      localIPs[ip] = true;
    }

    //create a bogus data channel
    pc.createDataChannel("");

    // create offer and set local description
    pc.createOffer()
      .then(function(sdp: any) {
        sdp.sdp
          .split("\n")
          .forEach(function(line: {
            indexOf: (arg0: string) => number;
            match: (arg0: RegExp) => string[];
          }) {
            if (line.indexOf("candidate") < 0) return;
            line.match(ipRegex).forEach(iterateIP);
          });

        (pc.setLocalDescription as any)(sdp, noop, noop);
      })
      .catch(function(reason) {
        // An error occurred, so handle the failure to connect
      });

    //sten for candidate events
    pc.onicecandidate = function(ice) {
      if (
        !ice ||
        !ice.candidate ||
        !ice.candidate.candidate ||
        !ice.candidate.candidate.match(ipRegex)
      )
        return;
      ice.candidate.candidate.match(ipRegex)!.forEach(iterateIP);
    };
  });
}
