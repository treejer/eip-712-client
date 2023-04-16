import React, { useEffect, useState } from "react";
import TreeFactoryV3 from "./abi/TreeFactoryV3.json";
import getWeb3 from "./getWeb3";
import { config } from "./config";
import "./App.css";
var ethUtil = require("ethereumjs-util");
var sigUtil = require("eth-sig-util");

function App(props) {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [contract, setContract] = useState(null);
  const [signOption, setSignOption] = useState(1);
  const [executeOption, setExecuteOption] = useState(1);

  const [nonce, setNonce] = useState(0);
  const [treeId, setTreeId] = useState(0);
  const [treeSpecs, setTreeSpecs] = useState("");
  const [birthDate, setBirthDate] = useState(0);
  const [countryCode, setCountryCode] = useState(0);

  const [signature, setSignature] = useState("");
  const [signer, setSigner] = useState("");
  const [userSignedMessage, setUserSignedMessage] = useState("");

  const [treeDataId, setTreeDataId] = useState(0);

  const [treeData, setTreeData] = useState();

  useEffect(async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      // Get the contract instance.

      const instance = new web3.eth.Contract(
        TreeFactoryV3.abi,
        config.verifyingContract
      );

      setWeb3(web3);
      setAccounts(accounts);

      setContract(instance);
    } catch (error) {
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`
      );
      console.error(error);
    }
  }, []);

  const signData = async () => {
    var signer = accounts[0];

    web3.currentProvider.sendAsync(
      {
        method: "net_version",
        params: [],
        jsonrpc: "2.0",
      },

      function (err, result) {
        let primaryTypeObj;
        let primaryType;
        let messageParams = {};

        if (signOption == 1) {
          primaryType = "plantAssignTree";
          primaryTypeObj = [
            { name: "nonce", type: "uint256" },
            { name: "treeId", type: "uint256" },
            { name: "treeSpecs", type: "string" },
            { name: "birthDate", type: "uint64" },
            { name: "countryCode", type: "uint16" },
          ];
          messageParams = {
            nonce,
            treeId,
            treeSpecs,
            birthDate,
            countryCode,
          };
        } else if (signOption == 2) {
          primaryType = "plantTree";
          primaryTypeObj = [
            { name: "nonce", type: "uint256" },
            { name: "treeSpecs", type: "string" },
            { name: "birthDate", type: "uint64" },
            { name: "countryCode", type: "uint16" },
          ];
          messageParams = {
            nonce,
            treeSpecs,
            birthDate,
            countryCode,
          };
        } else if (signOption == 3) {
          primaryType = "updateTree";
          primaryTypeObj = [
            { name: "nonce", type: "uint256" },
            { name: "treeId", type: "uint256" },
            { name: "treeSpecs", type: "string" },
          ];
          messageParams = { nonce, treeId, treeSpecs };
        }

        const msgParams = JSON.stringify({
          types: {
            EIP712Domain: [
              { name: "name", type: "string" },
              { name: "version", type: "string" },
              { name: "chainId", type: "uint256" },
              { name: "verifyingContract", type: "address" },
            ],
            [primaryType]: primaryTypeObj,
          },

          primaryType,
          domain: {
            name: config.name,
            version: config.version,
            chainId: config.chainId,
            verifyingContract: config.verifyingContract,
          },
          message: messageParams,
        });

        //////////////////////////////////////////////////////////

        var from = signer;
        console.log(
          "CLICKED, SENDING PERSONAL SIGN REQ",
          "from",
          from,
          msgParams
        );
        var params = [from, msgParams];

        var method = "eth_signTypedData_v3";
        web3.currentProvider.sendAsync(
          {
            method,
            params,
            from,
          },
          async function (err, result) {
            console.log("err", err);
            console.log("res", result);
            if (err) return err;
            if (result.error) {
              alert(result.error.message);
            }
            if (result.error) return console.error("ERROR", result);
            console.log("TYPED SIGNED:" + JSON.stringify(result.result));
            const recovered = sigUtil.recoverTypedSignature({
              data: JSON.parse(msgParams),
              sig: result.result,
            });
            if (
              ethUtil.toChecksumAddress(recovered) ===
              ethUtil.toChecksumAddress(from)
            ) {
            } else {
              alert(
                "Failed to verify signer when comparing " +
                  result +
                  " to " +
                  from
              );
            }

            const signature = result.result.substring(2);
            setUserSignedMessage(signature);
            console.log("signature", signature);
          }
        );
      }
    );
  };

  const getData = async () => {
    let res = await contract.methods.trees(treeDataId).call();
    setTreeData(res);
    console.log("res", res);
  };

  const execute = async () => {
    const r = "0x" + signature.substring(0, 64);
    const s = "0x" + signature.substring(64, 128);
    const v = parseInt(signature.substring(128, 130), 16);

    if (executeOption == 1) {
      const input = [
        [signer, [[nonce, treeId, treeSpecs, birthDate, countryCode, v, r, s]]],
      ];

      await contract.methods
        .verifyAssignedTreeBatch(input)
        .send({ from: accounts[0] });
    }
    if (executeOption == 2) {
      await contract.methods
        .verifyAssignedTree(
          nonce,
          signer,
          treeId,
          treeSpecs,
          birthDate,
          countryCode,
          v,
          r,
          s
        )
        .send({ from: accounts[0] });
    }
    if (executeOption == 3) {
      const input = [
        [signer, [[nonce, treeSpecs, birthDate, countryCode, v, r, s]]],
      ];

      await contract.methods.verifyTreeBatch(input).send({ from: accounts[0] });
    }
    if (executeOption == 4) {
      await contract.methods
        .verifyTree(nonce, signer, treeSpecs, birthDate, countryCode, v, r, s)
        .send({ from: accounts[0] });
    }
    if (executeOption == 5) {
      const input = [[signer, [[nonce, treeId, treeSpecs, v, r, s]]]];

      await contract.methods
        .verifyUpdateBatch(input)
        .send({ from: accounts[0] });
    }
    if (executeOption == 6) {
      await contract.methods
        .verifyUpdate(nonce, signer, treeId, treeSpecs, v, r, s)
        .send({ from: accounts[0] });
    }
  };

  if (!web3) {
    return <div>Loading Web3, accounts, and contract...</div>;
  }
  return (
    <div className="App">
      <h1>EIP 712 Simple Client</h1>

      <div style={{ justifyContent: "flex-start" }}>
        <h2> Sign Section</h2>
        <select>
          <option
            value="assign_plant"
            onClick={() => {
              setSignOption(1);
            }}
          >
            assign plant
          </option>
          <option
            value="plant"
            onClick={() => {
              setSignOption(2);
            }}
          >
            plant
          </option>
          <option
            value="update"
            onClick={() => {
              setSignOption(3);
            }}
          >
            update
          </option>
        </select>

        <input
          id="nonce"
          type="number"
          style={{ width: 150 }}
          onChange={(val) => {
            setNonce(Number(val.target.value));
          }}
          className="form-control"
          placeholder="nonce"
          required
        />
        {signOption == 1 || signOption == 3 ? (
          <input
            id="treeId"
            type="number"
            style={{ width: 150 }}
            onChange={(val) => {
              setTreeId(Number(val.target.value));
            }}
            className="form-control"
            placeholder="treeId"
            required
          />
        ) : undefined}
        <input
          id="treeSpecs"
          style={{ width: 150 }}
          onChange={(val) => {
            setTreeSpecs(val.target.value);
          }}
          className="form-control"
          placeholder="treeSpecs"
          required
        />

        {signOption == 1 || signOption == 2 ? (
          <input
            id="birthDate"
            type="number"
            style={{ width: 150 }}
            onChange={(val) => {
              setBirthDate(Number(val.target.value));
            }}
            className="form-control"
            placeholder="birthDate"
            required
          />
        ) : undefined}
        {signOption == 1 || signOption == 2 ? (
          <input
            id="countryCode"
            type="number"
            style={{ width: 150 }}
            onChange={(val) => {
              setCountryCode(Number(val.target.value));
            }}
            className="form-control"
            placeholder="countryCode"
            required
          />
        ) : undefined}
        <button onClick={signData}> Press to sign </button>
        <div style={{ marginTop: 20 }}>
          {" "}
          signed signature is: {userSignedMessage}
        </div>
      </div>

      <div style={{ marginTop: 30 }}>
        <h2>Verify Section</h2>
        <select>
          <option
            value="verifyAssignedTreeBatch"
            onClick={() => {
              setExecuteOption(1);
            }}
          >
            verify assigned tree batch
          </option>
          <option
            value="verifyAssignedTree"
            onClick={() => {
              setExecuteOption(2);
            }}
          >
            verify assigned tree
          </option>

          <option
            value="verifyTreeBatch"
            onClick={() => {
              setExecuteOption(3);
            }}
          >
            verify tree batch
          </option>
          <option
            value="verifyTree"
            onClick={() => {
              setExecuteOption(4);
            }}
          >
            verify tree
          </option>
          <option
            value="verifyUpdateBatch"
            onClick={() => {
              setExecuteOption(5);
            }}
          >
            verify update batch
          </option>

          <option
            value="verifyUpdate"
            onClick={() => {
              setExecuteOption(6);
            }}
          >
            verify update
          </option>
        </select>

        <input
          id="signer"
          onChange={(val) => {
            setSigner(val.target.value);
          }}
          className="form-control"
          placeholder="planter"
          required
        />

        <input
          id="sig"
          onChange={(val) => {
            setSignature(val.target.value);
          }}
          className="form-control"
          placeholder="Signature"
          required
        />

        <input
          id="nonce"
          type="number"
          style={{ width: 150 }}
          onChange={(val) => {
            setNonce(Number(val.target.value));
          }}
          className="form-control"
          placeholder="nonce"
          required
        />
        {[1, 2, 5, 6].includes(executeOption) ? (
          <input
            id="treeId"
            type="number"
            style={{ width: 150 }}
            onChange={(val) => {
              setTreeId(Number(val.target.value));
            }}
            className="form-control"
            placeholder="treeId"
            required
          />
        ) : undefined}
        <input
          id="treeSpecs"
          style={{ width: 150 }}
          onChange={(val) => {
            setTreeSpecs(val.target.value);
          }}
          className="form-control"
          placeholder="treeSpecs"
          required
        />

        {[1, 2, 3, 4].includes(executeOption) ? (
          <input
            id="birthDate"
            type="number"
            style={{ width: 150 }}
            onChange={(val) => {
              setBirthDate(Number(val.target.value));
            }}
            className="form-control"
            placeholder="birthDate"
            required
          />
        ) : undefined}
        {[1, 2, 3, 4].includes(executeOption) ? (
          <input
            id="countryCode"
            type="number"
            style={{ width: 150 }}
            onChange={(val) => {
              setCountryCode(Number(val.target.value));
            }}
            className="form-control"
            placeholder="countryCode"
            required
          />
        ) : undefined}

        <button onClick={execute}> Press to execute </button>
      </div>

      <view>
        <h2>Data Section</h2>

        <input
          id="treeDataId"
          type="number"
          style={{ width: 150 }}
          onChange={(val) => {
            setTreeDataId(Number(val.target.value));
          }}
          className="form-control"
          placeholder="treeId"
          required
        />
        <button onClick={getData}> Press to execute </button>
        {treeData && (
          <div style={{ marginTop: 20 }}>
            tree data is:
            <div> birthDate is: {treeData.birthDate} </div>
            <div> countryCode is: {treeData.countryCode}</div>
            <div> plantDate is: {treeData.plantDate}</div>
            <div>planter is: {treeData.planter} </div>
            <div>saleType is: {treeData.saleType} </div>
            <div> species is: {treeData.species}</div>
            <div>treeSpecs is: {treeData.treeSpecs} </div>
            <div>treeStatus is: {treeData.treeStatus} </div>
          </div>
        )}
      </view>
    </div>
  );
}

export default App;
